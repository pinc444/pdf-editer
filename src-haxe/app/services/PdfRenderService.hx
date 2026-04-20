package app.services;

import app.model.SessionInfo;
import js.lib.Promise;
import js.Syntax;

class PdfRenderService {
  public static function openFileDialog():Promise<Null<String>> {
    return cast Syntax.code("window.PdfEditorBridge.openFileDialog()");
  }

  public static function openPdf(path:String):Promise<SessionInfo> {
    return cast Syntax.code("window.PdfEditorBridge.openPdf({0})", path);
  }

  public static function render(filePath:String, pageOrder:Array<Int>):Promise<Dynamic> {
    return cast Syntax.code("window.PdfEditorBridge.renderPdf({0}, {1})", filePath, pageOrder);
  }
}
