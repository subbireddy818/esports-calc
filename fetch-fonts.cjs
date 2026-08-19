const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

const run = async () => {
  const antonUrl = 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm3Kz-C8M.woff2';
  const rajdhaniUrl = 'https://fonts.gstatic.com/s/rajdhani/v15/LDI2apCSOBg7S-QT7pb0B-OEKg.woff2';

  await download(antonUrl, path.join(fontsDir, 'Anton-Regular.woff2'));
  console.log('Downloaded Anton');
  
  await download(rajdhaniUrl, path.join(fontsDir, 'Rajdhani-Bold.woff2'));
  console.log('Downloaded Rajdhani');
};

run();
