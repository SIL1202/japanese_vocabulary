export function getAverageColor(imgUrl: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 避免 Picsum 圖片跨域問題導致 Canvas 污染
    img.src = imgUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ r: 0, g: 0, b: 0 });

      // 將圖片縮小到 1x1 像素，瀏覽器會自動幫我們計算出平均顏色
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);

      const imageData = ctx.getImageData(0, 0, 1, 1).data;
      resolve({
        r: imageData[0],
        g: imageData[1],
        b: imageData[2]
      });
    };

    img.onerror = () => {
      // 發生錯誤時回傳黑色作為 Safe Fallback
      resolve({ r: 0, g: 0, b: 0 });
    };
  });
}
