import app.ui.RootView;
import coconut.vdom.Renderer.hxx;
import js.Browser.document;

class Main {
  static function main() {
    var mount = document.getElementById("app");
    coconut.ui.Renderer.mount(cast mount, hxx('<RootView />'));
  }
}
