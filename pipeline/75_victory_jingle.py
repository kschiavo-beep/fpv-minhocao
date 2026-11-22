# Musiquinha de vitória original (chiptune, ~3,5 s): duas ondas quadradas + baixo triangular + brilho no final.
# Saída: ../audio/vitoria.wav e ../audio/vitoria.mp3 (o mp3 é o que vai embutido no HTML)
import numpy as np, wave, os, subprocess

SR = 22050; BEAT = 0.36
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio"); os.makedirs(out_dir, exist_ok=True)
f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
N = dict(G2=43, C3=48, F2=41, A2=45, G3=55, C4=60, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72, D5=74, E5=76, F5=77, G5=79, A5=81, B5=83, C6=84, E6=88, G6=91, C7=96)

def square(fr, t, duty=0.25): return np.where((t * fr) % 1.0 < duty, 1.0, -1.0)
def tri(fr, t): p = (t * fr) % 1.0; return 4 * np.abs(p - 0.5) - 1
def env(n, a=0.006, d=0.12, s=0.55, rel=0.05):
    t = np.arange(n) / SR; e = np.minimum(1, t / a) * (s + (1 - s) * np.exp(-t / d))
    r = int(rel * SR); e[-r:] *= np.linspace(1, 0, r); return e

def voice(seq, wave_fn, vol, vib=False, **kw):
    total = int(sum(d for _, d in seq) * BEAT * SR) + SR; buf = np.zeros(total); pos = 0
    for name, d in seq:
        n = int(d * BEAT * SR)
        if name:
            t = np.arange(n) / SR; fr = f(N[name])
            if vib and d >= 1.5: fr = fr * (1 + 0.012 * np.sin(2 * np.pi * 6 * t) * np.minimum(1, t / 0.25))
            buf[pos:pos + n] += wave_fn(fr, t, **kw) * env(n) * vol
        pos += n
    return buf

T = 1 / 3
lead = [("G4", T), ("C5", T), ("E5", T), ("G5", 2 * T), ("E5", T), ("G5", 1.0),
        ("F5", T), ("A5", T), ("C6", T), ("B5", T), ("G5", T), ("B5", T), ("C6", 2.5)]
harm = [(None, 1.0), ("E5", 2 * T), ("C5", T), ("E5", 1.0),
        ("C5", T), ("F5", T), ("A5", T), ("G5", T), ("D5", T), ("G5", T), ("G5", 2.5)]
bass = [("C3", 1.0), ("G2", 1.0), ("C3", 1.0), ("F2", 0.5), ("G2", 0.5), ("C3", 2.5)]
spark_start = 4.0
spark = [(None, spark_start), ("C6", 0.25), ("E6", 0.25), ("G6", 0.25), ("C7", 0.75)]

mix = voice(lead, square, 0.32, vib=True, duty=0.25)
h = voice(harm, square, 0.16, duty=0.5); mix[:len(h)] += h[:len(mix)] if len(h) <= len(mix) else h[:len(mix)]
b = voice(bass, tri, 0.42); mix[:len(b)] += b[:len(mix)]
s = voice(spark, square, 0.10, duty=0.125); mix[:len(s)] += s[:len(mix)]
end = int((6.5 * BEAT + 0.5) * SR); mix = mix[:end]
mix[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
mix = mix / np.max(np.abs(mix)) * 0.8
pcm = (mix * 32767).astype(np.int16)
wav = os.path.join(out_dir, "vitoria.wav")
with wave.open(wav, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
mp3 = os.path.join(out_dir, "vitoria.mp3")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "96k", mp3], check=True)
print(wav, round(len(pcm) / SR, 2), "s;", mp3, os.path.getsize(mp3), "bytes")
