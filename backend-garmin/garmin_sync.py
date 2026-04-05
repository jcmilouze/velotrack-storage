import os
import json
import argparse
import sys
import garth
from garminconnect import Garmin
from datetime import date

# Token cache directory (local to bridge for portability)
TOKEN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".session")

def sync(email, password, limit=10, upload_path=None):
    try:
        # 1. Initialize client
        client = Garmin(email, password)
        
        # 2. Attempt to resume session
        try:
            if os.path.exists(TOKEN_PATH):
                garth.resume(TOKEN_PATH)
                # Verify if we are still logged in
                client.get_user_summary(date.today().isoformat())
            else:
                # No session, perform initial login
                client.login()
                garth.save(TOKEN_PATH)
        except Exception:
            # Session expired or invalid, re-login
            client.login()
            garth.save(TOKEN_PATH)

        # 3. Handle UP/DOWN load
        if upload_path:
            upload_res = client.upload_activity(upload_path)
            return {
                "status": "success",
                "message": "Upload successful",
                "data": upload_res
            }

        activities = client.get_activities(0, limit)
        profile = client.get_user_summary(date.today().isoformat())
        
        return {
            "status": "success",
            "data": {
                "profile": profile,
                "activities": activities
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Garmin Sync Bridge for VeloTrack")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--upload", type=str, help="Path to GPX/FIT file to upload")
    
    args = parser.parse_args()
    
    try:
        output = sync(args.email, args.password, args.limit, args.upload)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as fatal:
        print(json.dumps({"status": "error", "message": str(fatal)}))
        sys.exit(1)
