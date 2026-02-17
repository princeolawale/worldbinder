const NFTScanner = {

  MAX_NFTS: 3,

  async scan(walletAddress) {
    try {
      console.log("Calling backend scan...");

      const response = await fetch("http://localhost:4321/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ wallet: walletAddress })
      });

      const data = await response.json();

      console.log("Scan response:", data);

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

    return {
      id: item.id,
      name: metadata.name || "Unknown NFT",
      image,
      traits
    };
  }

};
