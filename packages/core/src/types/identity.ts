export interface Identity {
  pub: string       // public key — user's ID across the whole system
  priv: string      // private key — never leaves the device
  epub: string      // encryption public key
  epriv: string     // encryption private key
  createdAt: number // unix timestamp
  backedUp: boolean // has the user exported their QR backup?
}
