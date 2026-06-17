import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache for release notes
cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACE = {'atom': 'http://www.w3.org/2005/Atom'}

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        entries = []
        
        for entry_node in root.findall('atom:entry', NAMESPACE):
            title_node = entry_node.find('atom:title', NAMESPACE)
            updated_node = entry_node.find('atom:updated', NAMESPACE)
            content_node = entry_node.find('atom:content', NAMESPACE)
            link_node = entry_node.find('atom:link', NAMESPACE)
            id_node = entry_node.find('atom:id', NAMESPACE)
            
            title = title_node.text if title_node is not None else "No Title"
            updated = updated_node.text if updated_node is not None else ""
            content = content_node.text if content_node is not None else ""
            link = link_node.attrib.get('href') if link_node is not None else ""
            entry_id = id_node.text if id_node is not None else ""
            
            entries.append({
                "id": entry_id,
                "title": title,
                "updated": updated,
                "link": link,
                "content": content
            })
            
        return entries, None
    except Exception as e:
        return None, str(e)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    
    if force_refresh or cache["data"] is None:
        data, error = fetch_and_parse_feed()
        if error:
            # If fetch fails but we have cached data, return cached data with warning
            if cache["data"] is not None:
                return jsonify({
                    "notes": cache["data"],
                    "source": "cache_fallback",
                    "error": f"Failed to refresh: {error}"
                })
            return jsonify({"error": error}), 500
        
        cache["data"] = data
        import datetime
        cache["last_fetched"] = datetime.datetime.now().isoformat()
        
    return jsonify({
        "notes": cache["data"],
        "source": "fresh" if force_refresh or cache["last_fetched"] is None else "cache",
        "last_fetched": cache["last_fetched"]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
