#!/usr/bin/env python

import urllib
import requests
import json
import os

from flask import Flask
from flask import request
from flask import make_response

# Flask app should start in global layout
app = Flask(__name__)


@app.route('/webhook', methods=['POST'])
def webhook():
    req = request.get_json(silent=True, force=True)

    print("Request:")
    print(json.dumps(req, indent=4))

    res = processRequest(req)

    res = json.dumps(res, indent=4)
    # print(res)
    r = make_response(res)
    r.headers['Content-Type'] = 'application/json'
    return r


def processRequest(req):
    if req.get("queryResult").get("action") != "Pokemon":
        return {}

    req = requests.get('http://pokeapi.co/api/v2/pokemon/5/')
    json_response = json.loads(req.content)
    print("Pokemon Name: " + json_response['name'])
    res = makeWebhookResult(data)
    return res


def makeWebhookResult(data):
    query = data.get('name')
    if query is None:
        return {}


    # print(json.dumps(item, indent=4))

    speech = query
    print("Response:")
    print(speech)


    return {
        "speech": speech,
        "displayText": speech,
        # "contextOut": [],
        "source": "pokeman"
    }


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))

    print "Starting app on port %d" % port

    app.run(debug=False, port=port, host='0.0.0.0')
