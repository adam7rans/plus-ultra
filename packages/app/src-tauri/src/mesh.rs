use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::Serialize;

// ---------------------------------------------------------------------------
// Relay state
// ---------------------------------------------------------------------------

#[derive(Clone)]
struct RelayState {
    /// Broadcast channel — every connected WS peer subscribes and publishes here.
    tx: tokio::sync::broadcast::Sender<String>,
}

// ---------------------------------------------------------------------------
// WebSocket handler (Gun relay protocol: fan-out to all peers)
// ---------------------------------------------------------------------------

async fn ws_upgrade_handler(
    ws: WebSocketUpgrade,
    State(state): State<RelayState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: RelayState) {
    let (mut sink, mut stream) = socket.split();
    let mut rx = state.tx.subscribe();
    let tx = state.tx.clone();

    // Forward incoming WS messages → broadcast channel
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = stream.next().await {
            let _ = tx.send(text);
        }
    });

    // Forward broadcast channel → this WS client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sink.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    tokio::select! {
        _ = &mut recv_task => send_task.abort(),
        _ = &mut send_task => recv_task.abort(),
    }
}

// ---------------------------------------------------------------------------
// Mesh handle — holds shutdown signal and mDNS daemon
// ---------------------------------------------------------------------------

pub struct MeshHandle {
    relay_shutdown: tokio::sync::oneshot::Sender<()>,
    mdns: ServiceDaemon,
}

pub struct MeshState {
    pub handle: Option<MeshHandle>,
}

impl MeshState {
    pub fn new() -> Self {
        MeshState { handle: None }
    }
}

// ---------------------------------------------------------------------------
// Start relay
// ---------------------------------------------------------------------------

/// Bind a Gun-compatible WebSocket relay on `port` and return the shutdown sender.
async fn start_relay_server(port: u16) -> Result<tokio::sync::oneshot::Sender<()>, String> {
    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(256);
    let state = RelayState { tx };

    let app = Router::new()
        .route("/gun", get(ws_upgrade_handler))
        .with_state(state);

    let addr: std::net::SocketAddr = format!("0.0.0.0:{port}")
        .parse()
        .expect("valid addr");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("bind failed: {e}"))?;

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    Ok(shutdown_tx)
}

// ---------------------------------------------------------------------------
// mDNS helpers
// ---------------------------------------------------------------------------

fn register_mdns(daemon: &ServiceDaemon, port: u16, tribe_id: &str) -> Result<(), String> {
    let service_type = "_plusultra._tcp.local.";
    // Instance name must be unique per device; use local IP suffix
    let ip_str = local_ip_str();
    let safe_tribe = sanitise_for_mdns(tribe_id, 8);
    let instance_name = format!("pu-{safe_tribe}");
    // mdns-sd wants a hostname that resolves — use IP-based label
    let host_label = ip_str.replace('.', "-");
    let host_name = format!("{host_label}.local.");

    let properties: HashMap<String, String> = HashMap::new();
    let service = ServiceInfo::new(
        service_type,
        &instance_name,
        &host_name,
        ip_str.as_str(),
        port,
        properties,
    )
    .map_err(|e| format!("ServiceInfo error: {e}"))?;

    daemon
        .register(service)
        .map_err(|e| format!("mDNS register error: {e}"))?;

    Ok(())
}

/// Spawn a thread that browses for `_plusultra._tcp` peers and emits Tauri events.
fn browse_mdns_peers(
    daemon: ServiceDaemon,
    app: tauri::AppHandle,
    local_port: u16,
) {
    let local_ip = local_ip_str();
    std::thread::spawn(move || {
        let service_type = "_plusultra._tcp.local.";
        let receiver = match daemon.browse(service_type) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[mesh] mDNS browse error: {e}");
                return;
            }
        };

        loop {
            match receiver.recv() {
                Ok(ServiceEvent::ServiceResolved(info)) => {
                    for addr in info.get_addresses() {
                        let ip = addr.to_string();
                        // Skip our own relay
                        if ip == local_ip && info.get_port() == local_port {
                            continue;
                        }
                        let url = format!("ws://{}:{}/gun", ip, info.get_port());
                        let _ = app.emit("mesh-peer-found", MeshPeerPayload { url });
                    }
                }
                Ok(ServiceEvent::ServiceRemoved(_, fullname)) => {
                    let _ = app.emit("mesh-peer-lost", MeshPeerLostPayload { fullname });
                }
                Ok(_) => {}
                Err(_) => break,
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Tauri-event payloads
// ---------------------------------------------------------------------------

#[derive(Clone, Serialize)]
struct MeshPeerPayload {
    url: String,
}

#[derive(Clone, Serialize)]
struct MeshPeerLostPayload {
    fullname: String,
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

fn local_ip_str() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

fn sanitise_for_mdns(s: &str, max_len: usize) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .take(max_len)
        .collect::<String>()
        .to_lowercase()
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Start the embedded Gun relay + advertise via mDNS + browse for peers.
/// `tribe_id` is used to label the mDNS service (helps filter irrelevant services).
#[tauri::command]
pub async fn start_mesh_relay(
    state: tauri::State<'_, Arc<Mutex<MeshState>>>,
    app: tauri::AppHandle,
    port: u16,
    tribe_id: String,
) -> Result<String, String> {
    let mut guard = state.lock().await;
    if guard.handle.is_some() {
        return Ok(local_ip_str()); // already running
    }

    let shutdown_tx = start_relay_server(port).await?;

    let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS daemon error: {e}"))?;

    register_mdns(&daemon, port, &tribe_id)?;
    browse_mdns_peers(daemon.clone(), app, port);

    guard.handle = Some(MeshHandle {
        relay_shutdown: shutdown_tx,
        mdns: daemon,
    });

    Ok(local_ip_str())
}

/// Stop the relay and mDNS.
#[tauri::command]
pub async fn stop_mesh_relay(
    state: tauri::State<'_, Arc<Mutex<MeshState>>>,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    if let Some(handle) = guard.handle.take() {
        // Signal axum shutdown
        let _ = handle.relay_shutdown.send(());
        // Stop mDNS daemon
        handle.mdns.shutdown().map_err(|e| format!("mDNS shutdown error: {e}"))?;
    }
    Ok(())
}

/// Return the device's local network IP address.
#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_str()
}
