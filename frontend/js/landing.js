/* ============================================
   WORLDBINDER — Landing Page Logic
   NFT gate + registration flow
   ============================================ */

(function () {
  'use strict';

  /* --- DOM Refs --- */
  const btnConnect   = document.getElementById('btn-connect-wallet');
  const modalReg     = document.getElementById('modal-register');
  const modalNoNFT   = document.getElementById('modal-no-nft');
  const photoUpload  = document.getElementById('photo-upload');
  const photoInput   = document.getElementById('photo-input');
  const photoPreview = document.getElementById('photo-preview');
  const photoHolder  = document.getElementById('photo-placeholder');
  const inputName    = document.getElementById('input-username');
  const btnRegister  = document.getElementById('btn-register');
  const onlineCount  = document.getElementById('online-count');
  const btnCloseNoNFT = document.getElementById('btn-close-no-nft');
  const scanStatus   = document.getElementById('scan-status');

  let avatarDataURL = null;
  let scannedNFTs = [];

  /* --- If already logged in, go to game --- */
  if (WalletManager.isLoggedIn()) {
    window.location.href = 'app.html';
    return;
  }

  /* --- Online counter animation --- */
  function animateOnline() {
    const base = 159;
    const delta = Math.floor(Math.random() * 7) - 3;
    onlineCount.textContent = Math.max(140, base + delta);
  }
  setInterval(animateOnline, 4000);

  /* --- Connect Wallet --- */
  btnConnect.addEventListener('click', async () => {
    btnConnect.textContent = 'CONNECTING...';
    btnConnect.disabled = true;

    try {
      const walletAddr = await WalletManager.connect();

      /* Check if player already registered with NFTs */
      const existing = WalletManager.getPlayer();
      if (existing && existing.nfts && existing.nfts.length > 0) {
        window.location.href = 'app.html';
        return;
      }

      /* ====== NFT GATE CHECK ====== */
      btnConnect.textContent = 'SCANNING WALLET...';

      scannedNFTs = await NFTScanner.scan(walletAddr);

      if (scannedNFTs.length === 0) {
        /* No NFTs found — block access */
        modalNoNFT.classList.remove('hidden');
        btnConnect.textContent = 'CONNECT WALLET';
        btnConnect.disabled = false;
        return;
      }

      /* NFTs found — show count and proceed to registration */
      if (scanStatus) {
        scanStatus.textContent = `${scannedNFTs.length} warrior(s) found in your wallet!`;
        scanStatus.classList.remove('hidden');
      }

      /* Show registration modal */
      modalReg.classList.remove('hidden');

    } catch (err) {
      alert('Could not connect wallet. Make sure Phantom is installed.');
    } finally {
      btnConnect.textContent = 'CONNECT WALLET';
      btnConnect.disabled = false;
    }
  });

  /* --- Close No-NFT Modal --- */
  if (btnCloseNoNFT) {
    btnCloseNoNFT.addEventListener('click', () => {
      modalNoNFT.classList.add('hidden');
    });
  }

  /* --- Photo Upload --- */
  photoUpload.addEventListener('click', () => photoInput.click());

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarDataURL = ev.target.result;
      photoPreview.src = avatarDataURL;
      photoPreview.classList.remove('hidden');
      photoHolder.classList.add('hidden');
      validateForm();
    };
    reader.readAsDataURL(file);
  });

  /* --- Username Input --- */
  inputName.addEventListener('input', validateForm);

  function validateForm() {
    const nameOk = inputName.value.trim().length >= 2;
    btnRegister.disabled = !nameOk;
  }

  /* --- Register --- */
  btnRegister.addEventListener('click', () => {
    const player = {
      username: inputName.value.trim(),
      photo: avatarDataURL || 'assets/default-avatar.png',
      wallet: WalletManager.getStoredWallet(),
      points: 0,
      wins: 0,
      losses: 0,
      skills: {
        bladeStrike:  { level: 1, maxLevel: 5 },
        energyBurst:  { level: 0, maxLevel: 5 },
        meteorRain:   { level: 0, maxLevel: 3 },
        defense:      { level: 0, maxLevel: 5 },
        healing:      { level: 0, maxLevel: 5 }
      },
      nfts: scannedNFTs
    };

    WalletManager.savePlayer(player);
    window.location.href = 'app.html';
  });

})();
