#!/usr/bin/env python3
"""Normalize the raw Mechvibes packs into the one shape the game ships.

Reads  data/raw/sounds/<original pack folder>/   (config.json + sprite or per-key files)
Writes public/sounds/keys/<id>/sound.m4a         (one AAC-LC mono sprite)
       public/sounds/keys/<id>/config.json       (minified {id, name, author, defines})
       src/assets/data/key_packs.json            (catalog the runtime loads from)

Every pack, `single` or `multi`, goes through the same path: resolve each key to a
clip, decode to mono 44.1 kHz PCM, trim trailing silence, dedupe identical clips,
concatenate with a silence gap, encode once, and rewrite `defines` as
`[startMs, durationMs]` offsets into the new sprite.

Offline tool, not part of the Vite build. Needs python3 (stdlib only) and ffmpeg.

Raw sources are NOT kept in the repo (deleted after the first build to save space);
the built packs in public/sounds/keys/ are the source of truth. Packs with no raw
folder are left untouched and keep their catalog entry.

Adding a new pack:
  1. Download it from https://mechvibes.com and drop the unzipped folder (config.json
     plus its sprite or per-key files) into data/raw/sounds/<folder>/.
  2. Add a PACKS entry below: kebab-case `id`, `dir` = that folder name, display
     `name` and `author` (from the config's `m_author`, or None for Mechvibes
     pre-installed packs). List order = settings picker order.
  3. Run `python3 data/build_sound_packs.py`.
  4. Give it an unlock percent in Settings.audio.keyPacks.unlocks (src/js/Settings.js)
     or add it to `freeIds`, and credit it in the root README.
  5. Delete data/raw/sounds/ again.

Re-encoding an existing pack (e.g. after changing BITRATE or GAP_MS) needs its raw
folder back first; never feed it a built sound.m4a, it would re-encode lossy audio.
"""

import array
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw" / "sounds"
OUT_DIR = ROOT / "public" / "sounds" / "keys"
CATALOG_PATH = ROOT / "src" / "assets" / "data" / "key_packs.json"

SAMPLE_RATE = 44100
GAP_MS = 30
BITRATE = "96k"
# ~ -50 dBFS: gentle enough to keep reverb tails, strict enough to drop dead air.
SILENCE_THRESHOLD = 100
MIN_CLIP_MS = 5
SOURCE_TYPE = 'audio/mp4; codecs="mp4a.40.2"'

# Catalog order is the order the settings picker shows.
PACKS = [
    {"id": "cherrymx-red-abs", "dir": "cherrymx-red-abs", "name": "Cherry MX Red", "author": None},
    {"id": "model-f-xt", "dir": "model-f-xt", "name": "Model F XT", "author": "Rezenee"},
    {"id": "eg-crystal-purple", "dir": "eg-crystal-purple", "name": "EG Crystal Purple", "author": None},
    {"id": "cherrymx-blue-abs", "dir": "cherrymx-blue-abs", "name": "Cherry MX Blue", "author": None},
    {"id": "creams", "dir": "Creams", "name": "Creams", "author": "Aksh Aggarwal"},
    {"id": "unicomp-classic", "dir": "unicompclassic", "name": "Unicomp Classic", "author": "Thànhh the Xignature"},
    {"id": "typewriter", "dir": "Typewriter 1.0 Beta", "name": "Máquina de escribir", "author": "thonkadonk"},
    {"id": "fallout-terminal", "dir": "Fallout_Terminal", "name": "Terminal de Fallout", "author": "Ditoxin"},
    {"id": "animalese", "dir": "Animalese", "name": "Animalese (Isabelle)", "author": "Nihilistic Janitor"},
    {"id": "animal-crossing-new-leaf", "dir": "animal crossing nl", "name": "Animal Crossing: New Leaf", "author": "Ameer Yaqoob"},
    {"id": "chrono-trigger", "dir": "Chrono Trigger Keyboard", "name": "Chrono Trigger", "author": "M. Kirin"},
]

AUDIO_EXTENSIONS = {".wav", ".ogg", ".m4a", ".mp3", ".flac"}


def decode_pcm(path: Path) -> array.array:
    """Decode any audio file to mono 44.1 kHz signed 16-bit samples."""
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "-"],
        capture_output=True,
        check=True,
    )
    samples = array.array("h")
    samples.frombytes(result.stdout)
    if sys.byteorder == "big":
        samples.byteswap()
    return samples


def trim_trailing_silence(samples: array.array) -> array.array:
    min_length = SAMPLE_RATE * MIN_CLIP_MS // 1000
    end = len(samples)
    while end > min_length and abs(samples[end - 1]) < SILENCE_THRESHOLD:
        end -= 1
    return samples[:end]


def normalize_name(name: str) -> str:
    return re.sub(r"[\s\-_]+", "", name).lower()


def find_file(pack_dir: Path, name: str):
    """Match a referenced file leniently on case and `-`/`_`/space."""
    exact = pack_dir / name
    if exact.is_file():
        return exact
    wanted = normalize_name(name)
    for candidate in pack_dir.iterdir():
        if candidate.is_file() and normalize_name(candidate.name) == wanted:
            return candidate
    return None


def find_sprite(pack_dir: Path, config: dict):
    found = find_file(pack_dir, config.get("sound", ""))
    if found:
        return found
    # cherrymx-red-abs / model-f-xt were re-encoded to sound.m4a but kept `sound.ogg`.
    for candidate in sorted(pack_dir.iterdir()):
        if candidate.suffix.lower() in AUDIO_EXTENSIONS:
            return candidate
    return None


def collect_clips(pack_dir: Path, config: dict):
    """Return {keycode: samples} with trailing silence trimmed."""
    defines = config["defines"]
    clips = {}
    skipped = []

    if config.get("key_define_type") == "single":
        sprite_path = find_sprite(pack_dir, config)
        if not sprite_path:
            raise RuntimeError(f"{pack_dir.name}: sprite not found")
        sprite = decode_pcm(sprite_path)
        for keycode, region in defines.items():
            if not isinstance(region, list) or len(region) < 2:
                continue
            start_ms, duration_ms = region[0], region[1]
            if duration_ms <= 0:
                continue
            start = int(round(start_ms * SAMPLE_RATE / 1000))
            end = start + int(round(duration_ms * SAMPLE_RATE / 1000))
            clip = sprite[start:end]
            if len(clip) == 0:
                skipped.append(keycode)
                continue
            clips[keycode] = trim_trailing_silence(clip)
    else:
        decoded = {}
        for keycode, filename in defines.items():
            if not filename:
                continue
            path = find_file(pack_dir, filename)
            if not path:
                skipped.append(f"{keycode}:{filename}")
                continue
            if path not in decoded:
                decoded[path] = trim_trailing_silence(decode_pcm(path))
            clips[keycode] = decoded[path]

    return clips, skipped


def build_pack(entry: dict):
    pack_dir = RAW_DIR / entry["dir"]
    config = json.loads((pack_dir / "config.json").read_text(encoding="utf-8"))
    clips, skipped = collect_clips(pack_dir, config)
    if not clips:
        raise RuntimeError(f"{entry['id']}: no clips resolved")

    gap = array.array("h", [0] * (SAMPLE_RATE * GAP_MS // 1000))
    sprite = array.array("h")
    placed = {}  # sha1 of clip -> [startMs, durMs]
    defines = {}

    # Leading gap so the first clip never starts on encoder priming residue.
    sprite.extend(gap)
    for keycode in sorted(clips, key=lambda k: int(k)):
        clip = clips[keycode]
        digest = hashlib.sha1(clip.tobytes()).hexdigest()
        if digest not in placed:
            start_ms = round(len(sprite) * 1000 / SAMPLE_RATE)
            placed[digest] = [start_ms, round(len(clip) * 1000 / SAMPLE_RATE)]
            sprite.extend(clip)
            sprite.extend(gap)
        defines[keycode] = placed[digest]

    out = OUT_DIR / entry["id"]
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    pcm = sprite
    if sys.byteorder == "big":
        pcm = array.array("h", sprite)
        pcm.byteswap()
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y",
            "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "-",
            "-c:a", "aac", "-b:a", BITRATE, "-movflags", "+faststart",
            str(out / "sound.m4a"),
        ],
        input=pcm.tobytes(),
        check=True,
    )

    meta = {"id": entry["id"], "name": entry["name"]}
    if entry["author"]:
        meta["author"] = entry["author"]
    meta["defines"] = defines
    (out / "config.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    size = (out / "sound.m4a").stat().st_size
    print(f"{entry['id']}: {len(defines)} keys, {len(placed)} unique clips, {size} bytes"
          + (f", skipped {skipped}" if skipped else ""))

    catalog = {"id": entry["id"], "name": entry["name"]}
    if entry["author"]:
        catalog["author"] = entry["author"]
    catalog["configUrl"] = f"/sounds/keys/{entry['id']}/config.json"
    catalog["sources"] = [{
        "url": f"/sounds/keys/{entry['id']}/sound.m4a",
        "type": SOURCE_TYPE,
        "size": size,
        "offsetCompensationMs": 0,
    }]
    return catalog


def load_existing_catalog() -> dict:
    if not CATALOG_PATH.exists():
        return {}
    return {item["id"]: item for item in json.loads(CATALOG_PATH.read_text(encoding="utf-8"))}


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")

    # Raw sources aren't kept in the repo, so a pack without a raw folder keeps its
    # already-built output and catalog entry; only packs with a raw folder are rebuilt.
    existing = load_existing_catalog()
    catalog = []
    for entry in PACKS:
        if (RAW_DIR / entry["dir"]).is_dir():
            catalog.append(build_pack(entry))
        elif entry["id"] in existing and (OUT_DIR / entry["id"] / "sound.m4a").exists():
            print(f"{entry['id']}: no raw source, keeping built pack")
            catalog.append(existing[entry["id"]])
        else:
            sys.exit(f"{entry['id']}: no raw source in {RAW_DIR / entry['dir']} and no built pack")
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {CATALOG_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
