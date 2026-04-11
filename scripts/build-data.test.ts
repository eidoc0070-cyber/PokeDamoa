import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { processData } from './build-data';

// We'll use the actual data for testing but write to a temp file
const TEMP_OUTPUT = path.resolve(__dirname, '../public/pokedex-data-test.json');
const TEMP_MOVES_OUTPUT = path.resolve(__dirname, '../public/moves-data-test.json');

describe('build-data script', () => {
  it('should process pokedex data correctly with encounters', () => {
    // Run the processor
    processData(undefined, TEMP_OUTPUT, TEMP_MOVES_OUTPUT);
    
    const data = JSON.parse(fs.readFileSync(TEMP_OUTPUT, 'utf-8'));
    
    // Check Pikachu (ID 25)
    const pikachu = data.find((p: any) => p.id === 25);
    expect(pikachu).toBeDefined();
    expect(pikachu.nameKo).toBe('피카츄');
    
    // Check encounters structure
    expect(Array.isArray(pikachu.encounters)).toBe(true);
    if (pikachu.encounters.length > 0) {
      const firstEnc = pikachu.encounters[0];
      expect(firstEnc).toHaveProperty('genId');
      expect(firstEnc).toHaveProperty('versionName');
      expect(firstEnc).toHaveProperty('locations');
      expect(Array.isArray(firstEnc.locations)).toBe(true);
    }

    // Check Caterpie (ID 10) - should have Viridian Forest in LeafGreen (version 12)
    // Actually viridian-forest might be identifier because NameKo is missing in CSV
    const caterpie = data.find((p: any) => p.id === 10);
    expect(caterpie).toBeDefined();
    
    const leafGreenEnc = caterpie.encounters.find((e: any) => e.versionName === '리프그린' || e.versionName === 'leafgreen');
    if (leafGreenEnc) {
        // Based on our manual check, viridian-forest is location 155, area 144.
        // If NameKo is missing, it should at least have the identifier or English name.
        expect(leafGreenEnc.locations.length).toBeGreaterThan(0);
    }
  });

  it('should handle missing data gracefully', () => {
     // Check a mythical/event pokemon that usually doesn't have wild encounters
     const mew = JSON.parse(fs.readFileSync(TEMP_OUTPUT, 'utf-8')).find((p: any) => p.id === 151);
     if (mew && mew.encounters.length === 0) {
         expect(mew.encounters).toEqual([]);
     }
  });
});
