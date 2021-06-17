# podetector
Power outage detector to turn off home assistant devices when power is restored
s
Podetector is a Node JS service that turn off home assistant's lights/switches after a power outage.

How it works:
1. Every X secons the software wakes up and check how much time passed since the last wake up. 
2. Power outage is detected if this time exceeds X secons ( with a "variance").
3. If power outage is detected podetector sends http requests to turn off home assistant's devices.

Podetector also exposes a REST api.

Setup:
There are a few variables you must setup. You can modify the default ones in the top of index.js file or you can set certain environment variables:
- HA_URL : Home assistant base url
- HA_TOKEN: Home assistant access token
- PORT: Listening port for the REST API
- CHECK_SECONDS: Time between "wake ups"
- VARIANCE: Allowed time variance

Use:
You can access to http://127.0.0.1:PORT/api to use the rest API.

[WIP]

