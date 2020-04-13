
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var session = require("express-session")({
    secret: "aAF324u(S/)(§",
    resave: true,
    saveUninitialized: true
});

var sharedsession = require("express-socket.io-session");
 

 





app.use(session);

// Use shared session middleware for socket.io
// setting autoSave:true
var used_shared_session = sharedsession(session, {
    autoSave:true
})
io.use(used_shared_session); 


app.use(express.static(__dirname + '/web'));




//app.get('/', function() {})

class User {
    constructor(username, master) {
      this.name = username;
      this.master = master;
      this.target = null;
      this.role =  null;
    }
    
  }


class WerBinIch {

    STAGES = {
        INIT: 1,
        WAITING: 2,
        GAME: 3,
      };

    constructor() {
        this.users =  {}
        this.user_sockets = {}
        this.stage = this.STAGES.INIT;
      }


    all_roles_assigned = function() {

        for (u in game.users){
            if (!game.users[u].role) {
                return false;
            }
        }
        return true;
    }

    get_roles = function(user) {

        var filtered = Object.fromEntries(Object.entries(this.users).filter(([k,v]) => user.name !== v.name));
    
        var roles = {}
    
        Object.keys(filtered).forEach(function(username) {
            roles[username] = filtered[username].role
        });

        return roles;
    
    }


    set_targets = function() {


        function random_permuatation_no_loops(k) {

            var array = new Array(k);
            for(var idx = 0; idx < k; idx++)
            {
                array[idx] = idx;
            }

            if (k === 1){
                return [0];
            }
        
            var currentIndex = k - 1 , temporaryValue, randomIndex;
          
            // While there remain elements to shuffle...
            while (0 < currentIndex) {
          
              // Pick a remaining element...
              randomIndex = Math.floor(Math.random() * currentIndex); // < currentIndex!
        
             
              if (array[randomIndex] === currentIndex) {
                  continue;
              }
              
              currentIndex -= 1; 
              temporaryValue = array[currentIndex];
              array[currentIndex] = array[randomIndex];
              array[randomIndex] = temporaryValue;
            }

            if (array[0] === 0){
                    var rand_swap = Math.floor(Math.random() * (k-1)) + 1
                    array[0] = array[rand_swap];
                    array[rand_swap] = 0;
            }
        
            return array;
          }


        var usernames = Object.keys(this.users);
        var k = usernames.length
        var random_perm = random_permuatation_no_loops(k);

        for( var i = 0; i < k; i++ ){
            this.users[ usernames[i]].target = this.users[usernames[ random_perm[i]]];
        }

    
    }
    
    has_user = function(username) {
        if (username && this.users[username]) { return true };
        return false;
    }

    set_user_socket(user, socket){
        this.user_sockets[user.name] = socket;
    }
    
    add_user( user, socket) {
        this.users[user.name] = user;
        this.user_sockets[user.name] = socket;
    }

    get_user_socket(user) {
        return this.user_sockets[user.name];
    }

    set_stage = function(new_stage){

        if (this.stage === this.STAGES.INIT && new_stage === this.STAGES.WAITING) {
            this.stage  = this.STAGES.WAITING;
            this.set_targets();
            return true;

        }

        if (this.stage === this.STAGES.WAITING && new_stage === this.STAGES.GAME) {
            if ( this.all_roles_assigned() ) {
                this.stage  = this.STAGES.GAME;
                return true;
            }
        }

        return false;
    }
    

}


var game = new WerBinIch();




io.on('connection', function (socket) {
    console.log('on connection');
    

  var currentUser = null;


  socket.on('check user', function (username) {
    console.log("check user %s", socket.handshake.session.username);
    if (socket.handshake.session.username &&
        game.has_user(socket.handshake.session.username)) {
        console.log("user %s reconnected", socket.handshake.session.username);
        socket.user = game.users[socket.handshake.session.username]
        currentUser = socket.user;
        game.set_user_socket(currentUser, socket);
        
        socket.emit('successful login', currentUser.name, currentUser.master);
        if (game.stage == game.STAGES.INIT) {
            // pass
        } else if ( game.stage == game.STAGES.WAITING ) {
            console.log("sending watiging info");
            socket.emit("send gamestage", game.STAGES.WAITING);
            socket.emit('askwho', currentUser.target.name);
        } else if ( game.stage = game.STAGES.GAME ) {
            socket.emit("send gamestage", game.STAGES.GAME);
            socket.emit( 'showwhoiswho', game.get_roles(currentUser) );
        } 
    }
   });

  // Funktion, die darauf reagiert, wenn sich der Benutzer anmeldet
    socket.on('add user', function (username) {
        // Benutzername wird in der aktuellen Socket-Verbindung gespeichert
        
        console.log(`add user ${username}`);
        master_user = (Object.keys(game.users).length == 0);

        new_user = new User(username, master_user);


        if (game.has_user(username)) {
            console.log("user already exists");
            socket.emit('notifyerror', "user already exists");
            return;
        }

        game.add_user( new_user, socket);
        currentUser = new_user;
        console.log("added user %s on socket %s", username, socket.id);

        if(new_user.master) {
            console.log("as master user");
        }

        socket.handshake.session.username = username;
        socket.handshake.session.save();

        socket.user = new_user

        console.log("send login notification");
        socket.emit('successful login', new_user.name, new_user.master);
    
        // Alle Clients informieren, dass ein neuer Benutzer da ist.
        socket.broadcast.emit('notify user joined', new_user.name);
  });


  socket.on('send everybodysin', function () {
        console.log("gotsend everybodysin");
        if (currentUser && currentUser.master && game.stage == game.STAGES.INIT) {
            console.log("try switch to waiting stage");
            if ( game.set_stage(game.STAGES.WAITING) ) {
                
                for ( u in game.users) {
                    var user = game.users[u];
                    console.log(`send who to ${u}`);
                    game.get_user_socket(user).emit('askwho', user.target.name);
                }
                
                console.log("switching to waiting stage");
                io.emit("send gamestage", game.STAGES.WAITING);
            }

           

        }
  })

  socket.on('reset game', function () {
    if (currentUser && currentUser.master) {
            game.stage = game.STAGES.INIT;
            
            io.emit("send reset");
            console.log("switching to init stage");
            io.emit("send gamestage", game.STAGES.INIT);

            for(var s in io.sockets.sockets) {
    
                var socket = io.sockets.sockets[s];
                if ( socket.handshake && socket.handshake.session){
                    socket.handshake.session.username = null;
                    socket.handshake.session.save();
                }
            }            
            game = new WerBinIch();
            

    }
})

  socket.on('send whoiswho', function(whoisit) {
    console.log(`send who request`);
    if ( game.stage === game.STAGES.WAITING) {
        current_user = game.users[socket.handshake.session.username]
        current_user.target.role = whoisit;
        socket.emit("gotit")
        console.log(`got name from ${current_user.name}`);
        if ( game.set_stage(game.STAGES.GAME)){
           
            for ( u in game.users) {
                var user = game.users[u]
                game.get_user_socket(user).emit( 'showwhoiswho', game.get_roles(user) );
            }
            console.log("switching to game stage");
            io.emit("send gamestage", game.STAGES.GAME);
        }

    }
  
  });


});





var port = process.env.PORT || 8080;
server.listen(port, function () {
    console.log('Server listening to port %d', port);
  });
  