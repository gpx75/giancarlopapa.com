import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineMcpResource({
  description: 'Read the project README',
  uri: 'file:///README.md',
  handler: async (uri: URL) => {
    const content = await readFile(resolve('README.md'), 'utf-8');
    return {
      contents: [
        {
          uri: uri.toString(),
          text: content,
          mimeType: 'text/markdown'
        }
      ]
    };
  }
});
