import numpy as np
import wave
import struct
import os

TRACKS_TO_SYNTH = [
    {
        'filename': 'track_07_home_to_my_body.wav',
        'duration': 58,
        'base_hz': 432.0,
        'chords': [432.0, 540.0, 648.0, 864.0],
        'binaural_hz': 6.0
    },
    {
        'filename': 'track_08_trust_myself.wav',
        'duration': 86,
        'base_hz': 528.0,
        'chords': [528.0, 660.0, 792.0, 1056.0],
        'binaural_hz': 7.83
    },
    {
        'filename': 'track_09_softness_is_power.wav',
        'duration': 83,
        'base_hz': 639.0,
        'chords': [639.0, 798.75, 958.5, 1278.0],
        'binaural_hz': 5.5
    },
    {
        'filename': 'track_10_unconditional_worth.wav',
        'duration': 56,
        'base_hz': 963.0,
        'chords': [481.5, 601.875, 722.25, 963.0],
        'binaural_hz': 4.0
    }
]

sample_rate = 24000
out_dir = os.path.join(os.getcwd(), 'public', 'audio')
os.makedirs(out_dir, exist_ok=True)

for track in TRACKS_TO_SYNTH:
    out_path = os.path.join(out_dir, track['filename'])
    duration = track['duration']
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    
    # Generate warm organic ambient chord pad
    audio = np.zeros(num_samples)
    for i, freq in enumerate(track['chords']):
        weight = 1.0 / (i + 1)
        # Add subtle LFO vibrato / warmth
        lfo = 1.0 + 0.003 * np.sin(2 * np.pi * 0.2 * t + i)
        tone = np.sin(2 * np.pi * freq * lfo * t)
        # Add subtle second harmonic
        tone += 0.25 * np.sin(2 * np.pi * (freq * 2) * t)
        audio += weight * tone
        
    # Add gentle ocean breath swell envelope (period ~8s)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * (1.0 / 8.0) * t - np.pi/2)
    audio = audio * (0.6 + 0.4 * swell)
    
    # Add periodic gentle crystal bowl strikes every 12 seconds
    strike_interval = 12
    for strike_time in range(2, int(duration) - 4, strike_interval):
        strike_start = int(strike_time * sample_rate)
        strike_len = int(8.0 * sample_rate)
        if strike_start + strike_len > num_samples:
            strike_len = num_samples - strike_start
        st = np.linspace(0, strike_len / sample_rate, strike_len, endpoint=False)
        decay = np.exp(-st / 2.5)
        bowl = (np.sin(2 * np.pi * track['base_hz'] * st) +
                0.4 * np.sin(2 * np.pi * track['base_hz'] * 2.756 * st) +
                0.2 * np.sin(2 * np.pi * track['base_hz'] * 5.404 * st)) * decay
        audio[strike_start:strike_start + strike_len] += 0.5 * bowl

    # Envelope fade in and fade out (3s each)
    fade_in_samples = int(3.0 * sample_rate)
    fade_out_samples = int(3.0 * sample_rate)
    audio[:fade_in_samples] *= np.linspace(0, 1, fade_in_samples)
    audio[-fade_out_samples:] *= np.linspace(1, 0, fade_out_samples)
    
    # Normalize to -3dB
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = (audio / max_val) * 0.75
        
    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    
    with wave.open(out_path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())
        
    print(f"Generated {track['filename']} ({len(audio_int16)*2} bytes, {duration}s)")
