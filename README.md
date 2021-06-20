# podetector

<h2>Introduction:</h2>
Podetector is a software focused in solving a very specific problem in a very specific scenario.<br>
The proglem is: After a power outage, when power is restored, some "domotic" devices (mostly lights) don't remember their  previous status, so they turn on, even if they were off previously.<br>
For example:<br>
- You turn off the lights using "Ok google, turn off the lights", when you go to sleep.<br>
- While sleeping there is a power outage and the power is restored after a few minutes.<br>
- When lights have power again, they don't remember that they where off, so they turn on.<br>
- When you wake up, the lights have been on for the whole night :-(<br>

<h3>The scenario:</h3>
- You have some domotic lights, for example the ones compatible with Tuya system.<br>
- You have Home Assistant with Tuya integration.<br>

<h3>Summarizing:</h3>
Podetector is a software that turn off home assistant devices when power is restored after a power outage.<br>

<h2>How it works:</h2>
1. Every X secons the software wakes up and check how much time passed since the last wake up.<br>
2. Power outage is detected if this time exceeds X secons ( with some "variance").<br>
3. If power outage is detected podetector sends http requests to turn off home assistant's devices.<br>
<br>
Podetector also exposes a REST api.<br>

<h2>Setup:</h2>
<h3>Pre-requisites:</h3>
- Node JS installed<br>
- Home assistant with the light you want to switch off configured.<br>
- Home assistant API with a "Long-Lived Access Token". You can search how to setup this on the web.<br>
<h3>Configuration:</h3>
There are a few variables you must setup. You can modify the default ones in the top of index.js file or you can set certain environment variables:<br>
- HA_URL : Home assistant base url<br>
- HA_TOKEN: Home assistant access token<br>
- PORT: Listening port for the REST API<br>
- CHECK_SECONDS: Time between "wake ups"<br>
- VARIANCE: Allowed time variance<br>

<h2>Use:</h2>
1. Clone: git clone https://github.com/raulcalvo/podetector<br>
2. Move to podetector folder: cd podetector
3. Install modules: npm install<br>
4. Run: node index.js<br>

Now you can access to http://127.0.0.1:PORT/api to use the rest API.<br>

There are a few API calls you can use and they are explained in the /api endpoint.

<h2>Using with docker</h2>
To use podetector in a docker container you can go to Docker-hub page to have more information:<br>
<a href="https://hub.docker.com/r/raulcalvo/podetector">Podetector in Docker-hub</a>
