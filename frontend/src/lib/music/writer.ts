// MusicXML Writer

import { parseStringPromise, Builder } from 'xml2js';
import JSZip from 'jszip';
import { Action } from '../algorithm/types';

export async function writeMusicXML(
  originalFile: File,
  fingering: Action[]
): Promise<Blob> {
  console.log('📝 Writing fingering to MusicXML...');
  
  let xmlContent: string;
  const isCompressed = originalFile.name.endsWith('.mxl');
  
  // Extract XML content
  if (isCompressed) {
    xmlContent = await extractMXLContent(originalFile);
  } else {
    xmlContent = await originalFile.text();
  }
  
  // Parse and add fingering
  const musicXML = await parseStringPromise(xmlContent);
  addFingeringToXML(musicXML, fingering);
  
  // Build XML string
  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });
  const newXmlContent = builder.buildObject(musicXML);
  
  // Return as appropriate format
  if (isCompressed) {
    return await createMXL(newXmlContent);
  } else {
    return new Blob([newXmlContent], { type: 'application/xml' });
  }
}

async function extractMXLContent(file: File): Promise<string> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  // Find main XML file
  let xmlFile = contents.file('META-INF/container.xml');
  
  if (xmlFile) {
    const containerXml = await xmlFile.async('string');
    const container = await parseStringPromise(containerXml);
    const rootfilePath = container?.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path'];
    
    if (rootfilePath) {
      xmlFile = contents.file(rootfilePath);
    }
  }
  
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

async function createMXL(xmlContent: string): Promise<Blob> {
  const zip = new JSZip();
  
  // Add container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="score.xml"/>
  </rootfiles>
</container>`;
  
  zip.folder('META-INF')?.file('container.xml', containerXml);
  zip.file('score.xml', xmlContent);
  
  return await zip.generateAsync({ type: 'blob' });
}

function addFingeringToXML(musicXML: any, fingering: Action[]): void {
  let fingeringIndex = 0;
  
  try {
    const parts = musicXML['score-partwise']?.part || [];
    
    for (const part of parts) {
      const measures = part.measure || [];
      
      for (const measure of measures) {
        const noteElements = measure.note || [];
        
        for (const noteElement of noteElements) {
          // Skip rests
          if (noteElement.rest) continue;
          
          // Skip chord notes
          if (noteElement.chord) continue;
          
          // Skip if no pitch
          if (!noteElement.pitch) continue;
          
          // Add fingering
          if (fingeringIndex < fingering.length) {
            const action = fingering[fingeringIndex];
            
            // Create technical element if not exists
            if (!noteElement.notations) {
              noteElement.notations = [{}];
            }
            
            if (!noteElement.notations[0].technical) {
              noteElement.notations[0].technical = [{}];
            }
            
            // Add fingering (finger number)
            noteElement.notations[0].technical[0].fingering = [
              { _: action.finger.toString() }
            ];
            
            // Add string number
            noteElement.notations[0].technical[0].string = [
              { _: (action.string + 1).toString() }  // MusicXML uses 1-based indexing
            ];
            
            fingeringIndex++;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error adding fingering to XML:', error);
    throw new Error('Failed to add fingering annotations');
  }
  
  console.log(`✅ Added fingering for ${fingeringIndex} notes`);
}
