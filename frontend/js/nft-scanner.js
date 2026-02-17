const NFTScanner = {

  MAX_NFTS: 3,

  async scan(walletAddress) {
    try {
      const response = await fetch(
        "https://worldbinder-api.onrender.com/api/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ wallet: walletAddress })
        }
      );

      if (!response.ok) {
        console.error("Scan request failed:", response.status);
        return [];
      }

      const data = await response.json();

      if (!data.nfts || data.nfts.length === 0) {
        return [];
      }

      return data.nfts.slice(0, this.MAX_NFTS).map(item =>
        this._parseNFT(item)
      );

    } catch (err) {
      console.error("NFT scan failed:", err);
      return [];
    }
  },

  _parseNFT(item) {
    const content = item.content || {};
    const metadata = content.metadata || {};
    const files = content.files || [];
    const links = content.links || {};
    const attributes = metadata.attributes || [];

    let image = links.image || "";
    if (!image && files.length > 0) {
      image = files[0].uri || files[0].cdn_uri || "";
    }

    const traits = { strength: 0, agility: 0, magic: 0 };

    attributes.forEach(attr => {
      const key = (attr.trait_type || "").toLowerCase();
      const val = parseInt(attr.value, 10);

      if (key === "strength" && !isNaN(val)) traits.strength = val;
      if (key === "agility" && !isNaN(val)) traits.agility = val;
      if (key === "magic" && !isNaN(val)) traits.magic = val;
    });

    let rarity = "common";
    const rarityAttr = attributes.find(a =>
      (a.trait_type || "").toLowerCase() === "rarity"
    );
    if (rarityAttr) {
      rarity = rarityAttr.value.toLowerCase();
    }

    let level = 1;
    const levelAttr = attributes.find(a =>
      (a.trait_type || "").toLowerCase() === "level"
    );
    if (levelAttr) {
      level = parseInt(levelAttr.value, 10) || 1;
    }

    return {
      id: item.id,
      name: metadata.name || "Unknown NFT",
      image,
      rarity,
      level,
      traits
    };
  },

  getAttackBonus(nftCount) {
    if (nftCount >= 3) return 20;
    if (nftCount >= 2) return 15;
    if (nftCount >= 1) return 10;
    return 0;
  }
};
