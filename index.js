const http = require('http')
const httpProxy = require('http-proxy')
const express = require('express')
const request = require('request')
const httpsrv = require('httpsrv')
const fs = require('fs')
const SECRET = /rpc-secret=(.*)/.exec(
	fs.readFileSync('aria2c.conf', 'utf-8')
)[1]
const ENCODED_SECRET = Buffer.from(SECRET).toString('base64')

const PORT = process.env.PORT || 1234
const app = express()
const proxy = httpProxy.createProxyServer({
	target: 'ws://localhost:6800',
	ws: true
})
const server = http.createServer(app)
const atob = require('atob')
const { spawn } = require('child_process');

// Proxy websocket
server.on('upgrade', (req, socket, head) => {
	proxy.ws(req, socket, head)
})

// Handle normal http traffic
app.use('/jsonrpc', (req, res) => {
	req.pipe(request('http://localhost:6800/jsonrpc')).pipe(res)
})
app.use(
	'/downloads/' + ENCODED_SECRET,
	httpsrv({
		basedir: __dirname + '/downloads'
	})
)
app.use('/ariang', express.static(__dirname + '/ariang'))
app.get('/', (req, res) => {
	res.send(`
<label for="secret">Enter your aria2 secret:</label>
<input id="secret" type="password">
<button id="panel">Go to AriaNg panel</button>
<button id="downloads">View downloaded files</button>
<script>
panel.onclick=function(){
	open('/ariang/#!/settings/rpc/set/wss/'+location.hostname+'/443/jsonrpc/'+btoa(secret.value),'_blank')
}
downloads.onclick=function(){
	open('/downloads/'+btoa(secret.value)+'/')
}
</script>
`)
})

app.get('/begin', (req, res) => {
	var host = req.host
	request(`https://heroku.vpss.me/begin?host=${host}`, function (error, response, data) {
		if (!error && response.statusCode == 200) {
			console.log('------vpss------', data);
		}
	});
})

app.get('/down', (req, res) => {
	// https://vpdown.herokuapp.com/down?baseurl=aHR0cHM6Ly9hc2lhbmNsdWIudHYvYXBpL3NvdXJjZS8yLTM4NWgyZDczLTdxeS0=&title=dGVzdA==&image=aHR0cHM6Ly9wb3JuaW1nLnh5ei8yMDIwLzA3MTAvMWZzZHNzMDY1cGwuanBn
	var acurl = atob(req.query.baseurl.replace('_', '/').replace('+', '-'))
	var title = unescape(atob(req.query.title.replace('_', '/').replace('+', '-')))
	var image = atob(req.query.image.replace('_', '/').replace('+', '-'))
	var id = req.query.id
	var host = req.host
	var base = id.split('-')[0].split(' ')[0]
	// /#!/new/task?url=${encoded_url}&${option_key_1}=${option_value_1}&...&${option_key_n}=${option_value_n}

	// https://down.vpss.me/#!/new/task?url=aHR0cHM6Ly9wb3JuaW1nLnh5ei8yMDIwLzA3MTAvMWZzZHNzMDY1cGwuanBn&out=%2ftest%2ftest.png

	// https://down.vpss.me/#!/settings/rpc/set/wss/down.vpss.me/6800/jsonrpc/dG0xOTY3MjM=
	// res.json({ 'acurl': acurl, 'title': title, 'image': image })
	// var passurl = 'https://' + req.hostname + '/ariang/#!/settings/rpc/set/wss/' + req.hostname + '/443/jsonrpc/' + ENCODED_SECRET
	// request(passurl, function (error, response, data) {
	// 	if (!error && response.statusCode == 200) {
	// 		console.log('------rpc------', data);

	// 	}
	// });
	request.post({ url: acurl }, function (error, response, data) {
		if (!error && response.statusCode == 200) {
			console.log('------ac------', data);
			var dataMap = JSON.parse(data);
			var files = dataMap['data']
			var fileurl = files[files.length - 1]['file']
			var cmd = `aria2c -o "${title}.jpg" -d downloads/${base} "${image}" --on-download-complete=./on-complete.sh --on-download-stop=./delete.sh && aria2c -x30 -o "${title}.mp4" -d downloads/${base} "${fileurl}" --on-download-complete=./on-complete.sh --on-download-stop=./delete.sh`
			var cmdsh = spawn(cmd, [], {
				shell: true,
				detached: true,
				stdio: 'ignore'
			});
			cmdsh.stdout.on('data', (data) => {
				console.log(`stdout: ${data}`);
				request(`https://heroku.vpss.me/done?host=${host}&id=${id}&succ=1`, function (error, response, data) {
					if (!error && response.statusCode == 200) {
						console.log('------vpss------', data);
					}
				});
			});

			cmdsh.stderr.on('data', (data) => {
				console.error(`stderr: ${data}`);
				request(`https://heroku.vpss.me/done?host=${host}&id=${id}&succ=0`, function (error, response, data) {
					if (!error && response.statusCode == 200) {
						console.log('------vpss------', data);
					}
				});
			});

			cmdsh.on('close', (code) => {
				console.log(`child process exited with code ${code}`);
				request(`https://heroku.vpss.me/done?host=${host}&id=${id}&succ=0`, function (error, response, data) {
					if (!error && response.statusCode == 200) {
						console.log('------vpss------', data);
					}
				});
			});
			cmdsh.cmdsh();

			res.json({
				'fileurl': fileurl,
				'image': image,
				'title': title,
				'cmd': cmd
			})
		}
	})
})
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`))

if (process.env.HEROKU_APP_NAME) {
	const readNumUpload = () =>
		new Promise((res, rej) =>
			fs.readFile('numUpload', 'utf-8', (err, text) =>
				err ? rej(err) : res(text)
			)
		)
	const APP_URL = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
	const preventIdling = () => {
		request.post(
			'http://localhost:6800/jsonrpc',
			{
				json: {
					jsonrpc: '2.0',
					method: 'aria2.getGlobalStat',
					id: 'preventIdling',
					params: [`token:${SECRET}`]
				}
			},
			async (err, resp, body) => {
				console.log('preventIdling: getGlobalStat response', body)
				const { numActive, numWaiting } = body.result
				const numUpload = await readNumUpload()
				console.log(
					'preventIdling: numbers',
					numActive,
					numWaiting,
					numUpload
				)
				if (
					parseInt(numActive) +
					parseInt(numWaiting) +
					parseInt(numUpload) >
					0
				) {
					console.log('preventIdling: make request to prevent idling')
					request(APP_URL)
				}
			}
		)
		setTimeout(preventIdling, 15 * 60 * 1000) // 15 min
	}
	preventIdling()
}
