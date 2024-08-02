const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { EventEmitter } = require('events'); // To manage events

const app = express();
const port = 5000;

// Event emitter instance
const eventEmitter = new EventEmitter();

// Middleware to parse JSON body
app.use(bodyParser.json());

// Middleware to handle CORS if needed
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/api/message', (req, res) => {

  axios.post(
    'http://localhost:3000/message',
    req.body.msg).then(r => {
      console.log(r)
      res.json(r.data)
    }).catch(error => {
      console.log('/api/message Error:', error.message)
      res.status(500).json({ error: 'Internal Server Error' });

    });
});

app.post('/api/connection', (req, res) => {
  try{
    axios.post(
      'http://test-project-5g.apps.openshift.devops.philips-healthsuitechina.com.cn/connection',
      req.body).then(r => {
        console.log(r)
        res.json(r.data)
      }).catch(error => {
        console.error('/api/connection Error occurred:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });

      })
  } catch(error) {
    console.error('Error fetching data:', error.message);
  }

 
});

// Endpoint to add data and send SSE
app.post('/message', bodyParser.text({ type: 'text/*' }), (req, res) => {
  const data = req.body;
  // var buf = Buffer.from(data, 'base64').toString('utf8'); // Ta-da
// Parse JSON string
  // const jsonObject = JSON.parse(data);
  // console.log(jsonObject)
  // Emit SSE event with the new data
  eventEmitter.emit('newData', data);

  // Respond with a success message
  res.json({ message: 'Data added successfully' });
});

app.get('/api/test', (req, res) => {
  eventEmitter.emit('newData', {'hello': "hi"});
  res.json({ message: 'Data added successfully' })
})
// SSE endpoint
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Function to send SSE message
  const sendSSE = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Listen for 'newData' events and send SSE
  const onData = (newData) => sendSSE(newData);
  eventEmitter.on('newData', onData);

   const intervalId = setInterval(() => {
    sendSSE({type: 'heartbeat', msg:'keep connection alive'})
  }, 30 * 1000);


  // Clean up event listener when client disconnects
  req.on('close', () => {
    clearInterval(intervalId);
    eventEmitter.removeListener('newData', onData);
    res.end();
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
