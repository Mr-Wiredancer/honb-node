(function(){
	db = new Firebase('https://honb.firebaseio.com/');
	db.on('value', function(snapshot) {
  		document.getElementById('counter').innerText = snapshot.val();
	});

	document.getElementById('heart').onclick = function(){
		db.once('value', function(snapshot){
			db.set(parseInt(snapshot.val())+1);
		});

	};

}())