/* ============================================
   WORLDBINDER — Wallet Module (Stable Version)
   Handles Phantom wallet connection & session
   ============================================ */

   const WalletManager = {

    publicKey: null,
  
    /** Check if Phantom is installed */
    isPhantomInstalled() {
      return typeof window !== "undefined" &&
             window.solana &&
             window.solana.isPhantom;
    },
  
    /** Connect to Phantom wallet */
    async connect() {
  
      if (!this.isPhantomInstalled()) {
        alert("Phantom wallet not detected. Please install Phantom.");
        window.open("https://phantom.app/", "_blank");
        throw new Error("Phantom not installed");
      }
  
      try {
        console.log("Requesting Phantom connection...");
  
        const response = await window.solana.connect({
          onlyIfTrusted: false
        });
  
        if (!response || !response.publicKey) {
          throw new Error("No public key returned from Phantom");
        }
  
        this.publicKey = response.publicKey.toString();
  
        console.log("Connected wallet:", this.publicKey);
  
        sessionStorage.setItem("wb_wallet", this.publicKey);
  
        return this.publicKey;
  
      } catch (err) {
        console.error("Wallet connection failed:", err);
        throw err;
      }
    },
  
    /** Disconnect wallet */
    async disconnect() {
      if (this.isPhantomInstalled()) {
        await window.solana.disconnect();
      }
  
      this.publicKey = null;
      sessionStorage.removeItem("wb_wallet");
      sessionStorage.removeItem("wb_player");
    },
  
    /** Get stored wallet address */
    getStoredWallet() {
      return sessionStorage.getItem("wb_wallet");
    },
  
    /** Get stored player data */
    getPlayer() {
      const raw = sessionStorage.getItem("wb_player");
      return raw ? JSON.parse(raw) : null;
    },
  
    /** Save player data */
    savePlayer(data) {
      sessionStorage.setItem("wb_player", JSON.stringify(data));
    },
  
    /** Check if logged in */
    isLoggedIn() {
      return !!this.getStoredWallet() && !!this.getPlayer();
    }
  };