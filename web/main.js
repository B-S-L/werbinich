$(function () {

    var STAGES = {
        INIT: 1,
        WAITING: 2,
        GAME: 3,
      };



    var $usernameInput = $('.usernameInput'); 
    var $whoiswhoInput = $('.whoiswhoInput'); 
    var $whoistarget = $('.whoistarget')
    var $messages = $('.messageslist');         
    var $welcomeheader = $('.welcomeheader');      

    var $gamemaster = $('.gamemaster');          

    var $loginForm = $('.loginform');     

    var $userRoles = $('.userrolestable');


    var $gotit = $('.gotit');

    initally_visile_fields = [  $gotit ]
    initally_hidden_fields = [  $gotit, $gamemaster, $welcomeheader ]
    initially_empty_fields = [ $userRoles, $messages  ]


    var game_stage = STAGES.INIT;
    var stage_pages = {}
    stage_pages[STAGES.INIT] = $('.init.page');
    stage_pages[STAGES.WAITING] = $('.waiting.page');
    stage_pages[STAGES.GAME] = $('.game.page');

    var username;  
    
    $usernameInput.focus();

    var socket = io();
  
    // Buttons 
    $(".usernamebutton").on('click', function() {
        setUsername();
    });

    $(".everybodysinbutton").on('click', function() {
        startGame();
    });

    $(".resetgamebutton").on('click', function() {
        if ($(".resetgamecheckbox:checked").length == 2) {
            sendResetGame();
        }       
    });

    var $window = $(window);
    $window.keydown(function (event) {
        // Die Return-key -> 13
        if (event.which === 13) {
            if (game_stage == STAGES.INIT && !username) {
                $(".usernamebutton").trigger("click");
            } 

            if (game_stage == STAGES.WAITING) {
                $(".whoiswhoButton").trigger("click");
            } 
        }
    });


    $(".whoiswhoButton").on('click', function() {
        sendWho();
    });


    // Benutzername wird gesetzt
    function setUsername() {
      // Benutzername aus Eingabefeld holen (ohne Leerzeichen am Anfang oder Ende).
      username = $usernameInput.val().trim();
  
      if (username) {
        $loginForm.fadeOut();
        socket.emit('add user', username);
      }
    }

    function setStageView(stage) {
        console.log(`set stage ${stage}`);

        for (var s in stage_pages) {
            stage_pages[s].hide();
        }
        stage_pages[stage].fadeIn();

        game_stage = stage;
    }
  
  

    function log(message) {
      var $el = $('<li>').addClass('log').text(message);
      $messages.append($el);
    }
    

    function printUserRoles(user_roles) {
        $userRoles.show();
        for (var user in user_roles) {
            var role = user_roles[user];
            var $el = $('<tr>').addClass('user_role').append( $('<td>').text(`${user}: `) ).append( $('<td>').text(role) );
            $userRoles.append($el);
        }0
    }


    function askWho(name) {
        $whoistarget.text(name);
        $whoiswhoInput.focus();
    }

    function sendWho(){

        whoisit = $whoiswhoInput.val().trim();
  
        if (whoisit) {
          socket.emit('send whoiswho', whoisit);
        }

        
    }

     
    function startGame(){
        socket.emit('send everybodysin');
    }

    function resetGame(){
        console.log("reset Game");
        for ( f in initially_empty_fields) {
            initially_empty_fields[f].empty();
        }
        for (f in initally_hidden_fields){
            initally_hidden_fields[f].hide();
        }

        username = null;
        $loginForm.show();
        socket = io();
        $usernameInput.focus();
    }

    function sendResetGame(){
    
        socket.emit('reset game');
    }

    // ==== Code für Socket.io Events
    
    socket.on('send gamestage', function(stage) {
        setStageView(stage);
    });

    socket.on('send reset', function () {
        resetGame();
    });

    // Server schickt "login": Anmeldung war erfolgreich
    socket.on('successful login', function (username, master) {
      console.log("successful login")
      $loginForm.hide();
      $welcomeheader.text(`Hi ${username}!`);
      $welcomeheader.show();

      if (master){
          $gamemaster.show();
      }


    });
  

    // Server schickt "user joined": Neuen Benutzer im Chat-Protokoll anzeigen
    socket.on('notify user joined', function (username) {
      log(username + ' joined');
    });
  

    socket.on('showwhoiswho', function (users) {
        printUserRoles(users);
    });


    socket.on('askwho', function (name) {
        console.log(`asked for ${name}`);
        askWho(name);
    });

    socket.on('gotit', function () {
        $gotit.show();
    });

    socket.on('test', function () {
        console.log("test event");
    });


    socket.emit('check user', {});

  });
  