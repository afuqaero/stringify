export async function analyzeAudio(arrayBuffer: ArrayBuffer, difficulty: string): Promise<{ buffer: AudioBuffer, notes: { time: number, lane: number }[], numLanes: number }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Settings based on difficulty
  let numLanes = 5;
  let chunkMs = 0.05; // 50ms default
  let thresholdMultiplier = 1.2;
  let cooldown = 0.1;

  if (difficulty === 'easy') {
    numLanes = 3;
    chunkMs = 0.1; // 100ms
    thresholdMultiplier = 1.8;
    cooldown = 0.4;
  } else if (difficulty === 'medium') {
    numLanes = 4;
    chunkMs = 0.08;
    thresholdMultiplier = 1.5;
    cooldown = 0.25;
  } else if (difficulty === 'hard') {
    numLanes = 5;
    chunkMs = 0.05;
    thresholdMultiplier = 1.3;
    cooldown = 0.15;
  } else if (difficulty === 'expert') {
    numLanes = 5;
    chunkMs = 0.03; // 30ms for very tight detection
    thresholdMultiplier = 1.1; // Picks up almost everything
    cooldown = 0.08;
  }

  // Use OfflineAudioContext to apply a Lowpass filter (isolate kick drums)
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  
  const filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150; // Keep only bass < 150Hz
  
  source.connect(filter);
  filter.connect(offlineCtx.destination);
  source.start(0);
  
  const filteredBuffer = await offlineCtx.startRendering();
  const channelData = filteredBuffer.getChannelData(0);
  const sampleRate = filteredBuffer.sampleRate;
  
  const chunkSize = Math.floor(sampleRate * chunkMs); 
  const notes: { time: number, lane: number }[] = [];
  
  let threshold = 0;
  let energySum = 0;
  let chunkEnergies = [];

  for (let i = 0; i < channelData.length; i += chunkSize) {
    let energy = 0;
    for (let j = 0; j < chunkSize && i + j < channelData.length; j++) {
      energy += Math.abs(channelData[i + j]);
    }
    energy = energy / chunkSize;
    chunkEnergies.push(energy);
    energySum += energy;
  }
  
  const averageEnergy = energySum / chunkEnergies.length;
  threshold = averageEnergy * thresholdMultiplier;
  
  let lastBeatTime = 0;
  
  for (let i = 0; i < chunkEnergies.length; i++) {
    if (chunkEnergies[i] > threshold) {
      const time = (i * chunkSize) / sampleRate;
      if (time - lastBeatTime > cooldown) { 
        const lane = Math.floor(Math.random() * numLanes);
        notes.push({ time, lane });
        lastBeatTime = time;
      }
    }
  }
  
  return { buffer: audioBuffer, notes, numLanes };
}

