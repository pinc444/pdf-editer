package app.model;

enum abstract AnnotationTool(String) {
  var Highlight = "highlight";
  var TextNote = "text-note";
  var Rectangle = "rectangle";
  var Underline = "underline";
}

typedef Annotation = {
  var page:Int;
  var tool:String;
  var text:String;
};

typedef SessionInfo = {
  var sessionId:String;
  var filePath:String;
  var pageCount:Int;
  var pageOrder:Array<Int>;
};
