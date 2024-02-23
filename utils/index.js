module.exports = {
  //Credits to Eldor (@polynite/splash)
  returnFinalHash: (packed) =>{
    if (!packed) return;
    const output = [];

    for (let i = 0; i < packed.length; i += 3) {
      const num = parseInt(packed.slice(i, i + 3), 10);
      isNaN(num)
      ? (()=>{
        return null;
      })()
      : output.push(num);
    }

    return Buffer.from(output.reverse()).toString("hex").toUpperCase();
  }
}