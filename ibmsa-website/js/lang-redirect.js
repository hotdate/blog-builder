
(function(){
  var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (lang.startsWith('fr')) {
    window.location.replace('/fr/index.html');
  } else {
    window.location.replace('/en/index.html');
  }
})();
