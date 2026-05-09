// MusicXML Parser

import { parseStringPromise } from 'xml2js';
import JSZip from 'jszip';
import { Note } from '../algorithm/types';
import { OPEN_STRING_PITCHES, POSITION_COUNT } from '../algorithm/const';

// Viola pitch range: C3(48) to C6(84) + small margin for extended range
const MIN_VIOLA_PITCH = OPEN_STRING_PITCHES[3]; // 48 (C3)
const MAX_VIOLA_PITCH = OPEN_STRING_PITCHES[0] + POSITION_COUNT - 1; // 69+35=104, but practical limit is lower
// Use a practical upper limit: notes playable on any string within POSITION_COUNT
function isPlayablePitch(pitch: number): boolean {
  for (let i = 0; i < OPEN_STRING_PITCHES.length; i++) {
    const position = pitch - OPEN_STRING_PITCHES[i];
    if (position >= 0 && position < POSITION_COUNT) return true;
  }
  return false;
}

export async function parseMusicXML(file: File): Promise<Note[]> {
  console.log(`📄 Parsing file: ${file.name}`);
  
  let xmlContent: string;
  
  // Handle .mxl (compressed) files
  if (file.name.endsWith('.mxl')) {
    xmlContent = await extractMXL(file);
  } else {
    xmlContent = await file.text();
  }
  
  const result = await parseStringPromise(xmlContent);
  const allNotes = extractNotes(result);
  
  // Filter out notes outside viola's playable range
  const notes = allNotes.filter(note => {
    if (isPlayablePitch(note.pitch)) return true;
    console.warn(`⚠️ Skipping out-of-range note: MIDI ${note.pitch} (viola range: ${MIN_VIOLA_PITCH}-${OPEN_STRING_PITCHES[0]}+${POSITION_COUNT-1})`);
    return false;
  });
  
  if (notes.length < allNotes.length) {
    console.log(`⚠️ Filtered ${allNotes.length - notes.length} out-of-range notes (kept ${notes.length})`);
  }
  
  console.log(`✅ Extracted ${notes.length} playable notes`);
  return notes;
}

async function extractMXL(file: File): Promise<string> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  // Find the main XML file (usually in META-INF/container.xml or root)
  let xmlFile = contents.file('META-INF/container.xml');
  
  if (xmlFile) {
    const containerXml = await xmlFile.async('string');
    const container = await parseStringPromise(containerXml);
    
    // Extract rootfile path
    const rootfilePath = container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path'];
    
    if (rootfilePath) {
      xmlFile = contents.file(rootfilePath);
    }
  }
  
  // Fallback: look for any .xml file
  if (!xmlFile) {
    const xmlFiles = Object.keys(contents.files).filter(name => name.endsWith('.xml'));
    if (xmlFiles.length > 0) {
      xmlFile = contents.file(xmlFiles[0]);
    }
  }
  
  if (!xmlFile) {
    throw new Error('No XML file found in MXL archive');
  }
  
  return await xmlFile.async('string');
}

function extractNotes(musicXML: any): Note[] {
  const notes: Note[] = [];
  
  try {
    const parts = musicXML['score-partwise']?.part || [];
    
    for (const part of parts) {
      const measures = part.measure || [];
      
      for (const measure of measures) {
        const noteElements = measure.note || [];
        
        for (const noteElement of noteElements) {
          // Skip rests
          if (noteElement.rest) continue;
          
          // Skip chord notes (already counted)
          if (noteElement.chord) continue;
          
          // Extract pitch
          const pitch = noteElement.pitch?.[0];
          if (!pitch) continue;
          
          const step = pitch.step?.[0];
          const octave = parseInt(pitch.octave?.[0] || '4');
          const alter = parseInt(pitch.alter?.[0] || '0');
          
          if (!step) continue;
          
          // Convert to MIDI pitch
          const midiPitch = stepToMidi(step, octave, alter);
          
          // Extract duration (optional)
          const duration = parseInt(noteElement.duration?.[0] || '1');
          
          notes.push({
            pitch: midiPitch,
            duration
          });
        }
      }
    }
  } catch (error) {
    console.error('Error extracting notes:', error);
    throw new Error('Failed to parse MusicXML structure');
  }
  
  return notes;
}

function stepToMidi(step: string, octave: number, alter: number): number {
  const stepValues: { [key: string]: number } = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };
  
  const baseNote = stepValues[step.toUpperCase()];
  if (baseNote === undefined) {
    throw new Error(`Invalid note step: ${step}`);
  }
  
  return 12 * (octave + 1) + baseNote + alter;
}
