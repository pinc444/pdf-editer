package app.services;

import js.lib.Promise;
import js.Syntax;

class PageOrderService {
  public static function saveOrder(sessionId:String, pageOrder:Array<Int>):Promise<Array<Int>> {
    return cast Syntax.code("window.PdfEditorBridge.updatePageOrder({0}, {1})", sessionId, pageOrder);
  }
}
