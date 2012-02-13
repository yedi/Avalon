function getDisplay(item, len) {
  if (arguments.length < 2){
    len = 24;
  }
  if (item.tldr === "" || item.tldr === null) {
    return item.body.substr(0, len)
  }
  return item.tldr;
}