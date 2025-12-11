import fs from "fs";
import path from "path";

/**
 * Lee un archivo de texto con enlaces (uno por línea) y retorna un arreglo de links.
 * Lanza un error si el archivo no existe o no se puede leer.
 */
export async function readDriveLinks(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`No existe el archivo: ${fullPath}`);
  }

  const data = await fs.promises.readFile(fullPath, "utf8");

  return data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

