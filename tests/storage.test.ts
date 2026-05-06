import { describe, it, expect, beforeEach } from 'bun:test'; // vitest -> bun:test
import { saveSettings, loadSettings, savePreset, loadPresets, deletePreset, SETTINGS_KEY } from '../src/state/storage.js';

describe('storage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveSettings & loadSettings', () => {
    it('should save and load settings correctly', () => {
      const settings = {
        isDarkMode: true,
        isCustomMode: false,
        generation: 9 as const
      };
      saveSettings(settings as any);
      
      const loaded = loadSettings();
      expect(loaded).toEqual(settings);
      expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
    });

    it('should return null if no settings saved', () => {
      expect(loadSettings()).toBeNull();
    });
  });

  describe('presets', () => {
    it('should save and load presets', () => {
      const presetData = { atk: 100, def: 80 };
      savePreset('my-preset', presetData);
      
      const presets = loadPresets();
      expect(presets['my-preset']).toMatchObject(presetData);
      expect(presets['my-preset'].updatedAt).toBeDefined();
    });

    it('should delete presets', () => {
      savePreset('to-delete', { some: 'data' });
      deletePreset('to-delete');
      
      const presets = loadPresets();
      expect(presets['to-delete']).toBeUndefined();
    });
  });
});
