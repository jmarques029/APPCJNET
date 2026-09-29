import * as fs from 'fs';
import * as path from 'path';

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Architectural Decoupling Rules', () => {
  const rootDir = path.resolve(__dirname, '../../src');

  it('A camada de Domínio (domain/) nunca deve importar React, Context API ou Adapters', () => {
    const domainFiles = getFilesRecursively(path.join(rootDir, 'domain'));
    const forbiddenImports = ['react', 'adapters', 'context', 'expo-secure-store', 'expo-router'];

    for (const filePath of domainFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const forbidden of forbiddenImports) {
        const regex = new RegExp(`from\\s+['"][^'"]*${forbidden}[^'"]*['"]`, 'i');
        expect(regex.test(content)).toBe(false);
      }
    }
  });

  it('A camada de Aplicação (application/) nunca deve importar React, Context API ou UI', () => {
    const appFiles = getFilesRecursively(path.join(rootDir, 'application'));
    const forbiddenImports = ['react', 'adapters/context', 'context', 'expo-router', 'react-native'];

    for (const filePath of appFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const forbidden of forbiddenImports) {
        const regex = new RegExp(`from\\s+['"][^'"]*${forbidden}[^'"]*['"]`, 'i');
        expect(regex.test(content)).toBe(false);
      }
    }
  });
});
