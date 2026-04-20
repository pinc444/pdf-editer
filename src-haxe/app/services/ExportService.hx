package app.services;

import js.lib.Promise;
import js.Syntax;

typedef ExportResult = {
  var outputPath:String;
  var metadataPath:String;
  var limitations:Array<String>;
};

class ExportService {
  public static function saveDialog():Promise<Null<String>> {
    return cast Syntax.code("window.PdfEditorBridge.saveFileDialog()");
  }

  public static function exportSession(sessionId:String, outputPath:String):Promise<ExportResult> {
    return cast Syntax.code("window.PdfEditorBridge.exportSession({0}, {1})", sessionId, outputPath);
  }
}
