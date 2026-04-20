package app.services;

import app.model.Annotation;
import js.lib.Promise;
import js.Syntax;

class AnnotationService {
  public static function addAnnotation(sessionId:String, annotation:Annotation):Promise<Dynamic> {
    return cast Syntax.code("window.PdfEditorBridge.addAnnotation({0}, {1})", sessionId, annotation);
  }
}
