const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createBackup() {
  const rootDir = path.resolve(__dirname, '..');
  const backupDir = path.join(rootDir, 'backup');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const zipName = `backup_${timestamp}.zip`;
  const zipPath = path.join(backupDir, zipName);

  console.log(`Creando copia de seguridad: ${zipName}...`);

  // Excluir la propia carpeta backup, repositorios git y módulos si existieran
  const cmd = `zip -r "${zipPath}" . -x "backup/*" -x ".git/*" -x "node_modules/*"`;
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });

  if (fs.existsSync(zipPath)) {
    const stat = fs.statSync(zipPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ Copia de seguridad completada con éxito: backup/${zipName} (${sizeMb} MB)`);
    return zipPath;
  } else {
    throw new Error('No se pudo generar el archivo de copia de seguridad.');
  }
}

if (require.main === module) {
  try {
    createBackup();
  } catch (err) {
    console.error('Error al crear la copia de seguridad:', err.message);
    process.exit(1);
  }
}

module.exports = { createBackup };
