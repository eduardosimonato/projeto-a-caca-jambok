"""Prepara trechos licenciados; não gera nem simula a gravação do motor."""
from pathlib import Path
import wave, array, math, base64, json

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    with wave.open(str(ROOT / path), 'rb') as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2
        return list(array.array('h', w.readframes(w.getnframes()))), w.getframerate()
def write(name, samples, rate):
    peak = max(abs(v) for v in samples) or 1
    samples = [int(v / peak * 26000) for v in samples]
    path=ROOT / 'assets/audio' / name
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(array.array('h',samples).tobytes())
    return base64.b64encode(path.read_bytes()).decode()

engine, rate = read('assets/audio/engine.wav')
# Fusão de 750 ms: o fim chega ao começo sem um estalo na emenda.
overlap = int(rate * .75)
loop = engine[overlap:-overlap] + [engine[-overlap+i]*(1-i/overlap)+engine[i]*(i/overlap) for i in range(overlap)]
gun, gr = read('sources/gun-full.wav')
gun = gun[:int(gr*.36)]
for i in range(min(200,len(gun))): gun[i] *= i/200
fade=int(gr*.08)
for i in range(fade): gun[-fade+i] *= 1-i/fade
assets={'engine':write('engine-loop.wav',loop,rate),'gun':write('gun-burst.wav',gun,gr)}
assets['emblem']='data:image/png;base64,'+base64.b64encode((ROOT/'assets/senta-a-pua.png').read_bytes()).decode()
assets['terrain']='data:image/png;base64,'+base64.b64encode((ROOT/'assets/italian-fields.png').read_bytes()).decode()
(ROOT/'js/media.js').write_text('window.AuroraMedia = '+json.dumps(assets)+';\n',encoding='utf8')
print('Prepared embedded audio and original emblem for offline use.')
