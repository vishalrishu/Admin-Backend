var express = require('express');
var router = express.Router();
const Client = require('pg').Client
let client = new Client("")
const uuid = require('uuid/v1')
client.connect()

router.get('/participants', function(req, res, next) {
  client.query("select * from participant", (err, result)=>{
    res.json(result.rows)
  })
});

router.get('/interviews', function(req, res, next) {
  client.query("select * from interview", (err, result)=>{
    res.json(result.rows)
  })
});

router.get('/participants/:interviewId', function(req, res, next) {
  client.query(`select p.p_id, p.name, p.email from participant_interview pi inner join participant p on pi.i_id=$1 AND p.p_id=pi.p_id`,[req.params.interviewId], (err, result)=>{
    res.json(result.rows)
  })
});

router.post('/interview', async (req, res) => {
  // req.body = {
  //   participants: [],
  //   i_id,
  //   description,
  //   startTS,
  //   endTS
  // }
  const interviewDetails = req.body;
  // let isInterviewUpdate = true;
  if(!interviewDetails.i_id) {
    // isInterviewUpdate = false
    interviewDetails.i_id = uuid();
  }
  if(interviewDetails.participants.length <2) {
    return res.json({error: 'Atleast two participants required'})
  }

  checkExistingInterviews(interviewDetails.participants, interviewDetails.i_id, interviewDetails.startTS, interviewDetails.endTS)
  .then(result=>{
  if(result.length) {
    return res.json({error: 'Schedule is overlapping'})
  }
const query = "insert into interview (i_id, description, startTS, endTS) VALUES ($1, $2, $3, $4)"
client.query(query, [interviewDetails.i_id, interviewDetails.description, interviewDetails.startTS, interviewDetails.endTS], (err, result)=>{
    let count = 0;
    // same api is used for update
    client.query('delete from participant_interview where i_id = $1', [interviewDetails.i_id], (err, result)=>{
      for(let i = 0;i<interviewDetails.participants.length;i++){
        client.query('insert into participant_interview (p_id, i_id) VALUES ($1, $2)', [interviewDetails.participants[i], interviewDetails.i_id], (err, result) => {
          count++
          if(count == interviewDetails.participants.length){
            res.json({i_id: interviewDetails.i_id})
          }
        })
      }
    })
    
  })
  })
  .catch(error=>{
    res.json({error: 'Internal server error'})
  })
})

function checkExistingInterviews(participants, interviewId, startTS, endTS) {
  return new Promise((resolve, reject)=>{
    const query = `select i.i_id from interview i inner join participant_interview pi on i.i_id = $1 AND i.i_id = pi.i_id AND pi.p_id in (${participants}) AND ((i.startTS < $2 AND i.endTS > $2) OR (i.startTS < $3 AND i.endTS > $3))`
    client.query(query,[interviewId, startTS, endTS], (err, result) => {
      if(err) {
        return reject(err)
      }
      resolve(result.rows)
    })
  })
  
}
module.exports = router;
