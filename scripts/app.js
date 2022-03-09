var _app = undefined; //for debugging purposes only.  don't write code with it

define([
  "util", "mesh", "mesh_tools", "mesh_editor", "const", "simple_toolsys",
  "transform", "events", "config", "ui", "image"
], function(util, mesh, mesh_tools, mesh_editor, cconst, toolsys,
            transform, events, config, ui, image)
{
  'use strict';
  
  var exports = _app = {};
  
  window.STARTUP_FILE_NAME = "startup_file_rs32";
  
  var AppState = exports.AppState = class AppState extends events.EventHandler {
    constructor() {
      super();
      
      this.last_save = 0;
      this.canvas = document.getElementById("canvas2d");
      this.g = this.canvas.getContext("2d");
      this.mesh = new mesh.Mesh();
      
      this.ctx = new toolsys.Context();
      this.toolstack = new toolsys.ToolStack();
      this.editor = new mesh_editor.MeshEditor();
      
      this.makeGUI();
      this.image = undefined;
    }
    
    makeGUI() {
      this.gui = new ui.UI(STARTUP_FILE_NAME+"_gui1", config);
      this.gui.slider("EXAMPLE_PARAM", "Example Param", 128, 1, 512, 1, true, false);
      this.gui.check("EXAMPLE_OPTION", "Example Option");
      
      this.gui.button("load_image", "Load Image", () => {
        console.log("load image!");
        image.loadImageFile().then((imagedata) => {
          console.log("got image!", imagedata);
          
          this.image = imagedata;
          window.redraw_all();
        });
      });
      
      this.gui.load();
    }
    
    setsize() {
      var w = window.innerWidth, h = window.innerHeight;
      
      var eventfire = this.canvas.width != w || this.canvas.height != h;
      
      if (this.canvas.width != w)
        this.canvas.width = w;
      if (this.canvas.height != h)
        this.canvas.height = h;
      
      if (eventfire)
        this.on_resize([w, h]);
    }
    
    draw() {
      this.setsize();
      this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (this.image !== undefined) {
        this.g.putImageData(this.image, 20, 20);
      }

      this.editor.draw(this.ctx, this.canvas, this.g);
    }
    
    genFile() {
      return JSON.stringify(this);
    }
    
    save() {
      localStorage[STARTUP_FILE_NAME] = this.genFile();
    }
        
    load(buf) {
      buf = buf === undefined ?  localStorage[STARTUP_FILE_NAME] : buf;
      
      try {
        this.loadJSON(JSON.parse(buf));
        this.gui.load();
      } catch (error) {
        util.print_stack(error);
        
        console.warn("Failed to load start-up file");
        return false;
      }
      
      this.gui.update();
      return true;
    }
    
    toJSON() {
      return {
        version : cconst.APP_VERSION,
        mesh    : this.mesh,
        config  : config
      };
    }
    
    loadJSON(obj) {
      this.mesh = new mesh.Mesh();
      this.mesh.loadJSON(obj.mesh);
      
      console.log(obj.config, "yay");
      
      if (obj.config !== undefined) {
        config.loadJSON(obj.config);
      }
      
      window.redraw_all();
      return this;
    }
    
    on_resize(newsize) {
      console.log("resize event");
      this.editor.on_resize(newsize);
    }
    
    on_mousedown(e) {
      this.editor.on_mousedown(e);
    }
    
    on_mousemove(e) {
      this.editor.on_mousemove(e);
    }
    
    on_mouseup(e) {
      this.editor.on_mouseup(e);
    }
    
    on_tick() {
      this.editor.on_tick();
      
      /*
      if (util.time_ms() - this.last_save > 900) {
        console.log("autosaving");
        this.save();
        
        this.last_save = util.time_ms();
      }
      //*/
    }
    
    on_keydown(e) {
      switch (e.keyCode) {
        case 90: //zkey
          if (e.ctrlKey && e.shiftKey && !e.altKey) {
            this.toolstack.redo();
            window.redraw_all();
          } else if (e.ctrlKey && !e.altKey) {
            this.toolstack.undo();
            window.redraw_all();
          }
          break;
        case 89: //ykey
          if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            this.toolstack.redo();
            window.redraw_all();
          }
          break;
          
        default:
          return this.editor.on_keydown(e);
      }
    }
  }
  
  function start() {
    window._appstate = new AppState();
    
    var canvas = document.getElementById("canvas2d");
    _appstate.pushModal(canvas, true);
    
    var animreq = undefined;
    function dodraw() {
      animreq = undefined;
      _appstate.draw();
    }
    
    window.redraw_all = function redraw_all() {
      if (animreq !== undefined) {
        return;
      }
      
      animreq = requestAnimationFrame(dodraw);
    }
    
    if (STARTUP_FILE_NAME in localStorage) {
      if (!_appstate.load()) {
        _appstate.popModal(canvas, this);
        
        window._appstate = new AppState();
        _appstate.pushModal(canvas, true);
        
        //make base file
        _appstate.toolstack.execTool(new mesh_tools.CreateDefaultFile());
        
        console.log("started!");
        window.redraw_all();
      }
    } else {
      //make base file
      _appstate.toolstack.execTool(new mesh_tools.CreateDefaultFile());
      console.log("started!");
      window.redraw_all();
    }
    
    window.setInterval(function() {
      _appstate.on_tick();
    }, 250);
  }

  start();
  
  return exports;
});
