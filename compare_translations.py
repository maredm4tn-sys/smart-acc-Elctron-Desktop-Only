import json
import os

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_keys(data, prefix=''):
    keys = set()
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys.update(get_keys(v, full_key))
    return keys

def compare():
    ar_path = 'src/messages/ar.json'
    en_path = 'src/messages/en.json'
    
    if not os.path.exists(ar_path) or not os.path.exists(en_path):
        print("Error: JSON files not found!")
        return

    ar_data = load_json(ar_path)
    en_data = load_json(en_path)
    
    ar_keys = get_keys(ar_data)
    en_keys = get_keys(en_data)
    
    missing_in_en = ar_keys - en_keys
    missing_in_ar = en_keys - ar_keys
    
    print(f"--- Comparison Report ---")
    print(f"Total AR Keys: {len(ar_keys)}")
    print(f"Total EN Keys: {len(en_keys)}")
    
    if not missing_in_en and not missing_in_ar:
        print("\n✅ Perfect Match! All keys are synchronized.")
    else:
        if missing_in_en:
            print(f"\n❌ Missing in EN ({len(missing_in_en)} keys):")
            for k in sorted(list(missing_in_en))[:20]:
                print(f"  - {k}")
            if len(missing_in_en) > 20: print("  ...")
            
        if missing_in_ar:
            print(f"\n❌ Missing in AR ({len(missing_in_ar)} keys):")
            for k in sorted(list(missing_in_ar))[:20]:
                print(f"  - {k}")
            if len(missing_in_ar) > 20: print("  ...")

if __name__ == "__main__":
    compare()
