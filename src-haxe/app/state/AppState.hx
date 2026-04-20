package app.state;

import app.model.Annotation;

class AppState {
  public var sessionId:String = "";
  public var filePath:String = "";
  public var pageCount:Int = 0;
  public var pageOrder:Array<Int> = [];
  public var annotations:Array<Annotation> = [];
  public var selectedIndex:Int = 0;
  public var status:String = "Open a PDF to start.";

  public function new() {}
}
