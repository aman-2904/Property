const fs = require('fs');
const readline = require('readline');

async function readLogs() {
  const logFile = 'C:\\Users\\lenovo\\.gemini\\antigravity-ide\\brain\\945d2654-80fa-4af8-abff-890a9f73acfc\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('list_triggers.js') && line.includes('CodeContent')) {
      console.log('FOUND WRITE TO list_triggers.js:');
      try {
        const obj = JSON.parse(line);
        const toolCalls = obj.tool_calls || [];
        for (const tc of toolCalls) {
          if (tc.name === 'write_to_file' && tc.args.TargetFile.includes('list_triggers.js')) {
            console.log(tc.args.CodeContent);
          }
        }
      } catch (e) {
        console.log('Error parsing line:', e.message);
      }
    }
  }
}

readLogs();
