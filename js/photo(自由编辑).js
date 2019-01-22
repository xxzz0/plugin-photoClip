function Photo(){
    this.src=null;
    this.clipWidth=500;//裁剪宽度
    this.clipHeight=400;//裁剪高度
    this.stageWidth=750;
    this.stageHeight=null;
    
    //event
    this.onComplete=function(base64){};
    this.onCancel=function(){};

    this.canvas=document.createElement('canvas');
    this.canvas.className="photo-canvas";
    this.canvas.setAttribute('style','position: fixed;width:100%;left:0;top:0;z-index: 500;background: rgba(0,0,0,0.5);');
    this.stage=new createjs.Stage(this.canvas);
    createjs.Touch.enable(this.stage);

    this.maskBox=null;
    this.photoBox=null;
    this.clipX=null;
    this.clipY=null;
    this.photo=new createjs.Bitmap();

    this._ctrl();
}
Photo.prototype.init=function(){
    var that=this;
    this.stage.removeAllChildren();
    this.stageHeight=document.documentElement.clientHeight*this.stageWidth/document.documentElement.clientWidth;
    this.canvas.width=this.stageWidth;
    this.canvas.height=this.stageHeight;
    this.maskBox=new createjs.Container();
    this.photoBox=new createjs.Container();
    this.stage.addChild(this.photoBox,this.maskBox);
    document.body.appendChild(this.canvas);
    //clip
    this.clipX=(this.stageWidth-this.clipWidth)/2;
    this.clipY=(this.stageHeight-this.clipHeight)/2;
    //photo
    var image=new Image();
    image.src=this.src;
    image.onload=function(){
        that.creatPhoto.call(that,image)
    }
    //mask
    var gMask=new createjs.Graphics();
    var mask=new createjs.Shape(gMask);
    this.maskBox.addChild(mask);
    gMask.beginFill("rgba(0,0,0,0.6)")
    gMask.moveTo(0,0).lineTo(this.stageWidth,0).lineTo(this.stageWidth,this.stageHeight).lineTo(0,this.stageHeight).lineTo(0,0).moveTo();
    gMask.moveTo(this.clipX,this.clipY).lineTo(this.clipX,this.clipY+this.clipHeight).lineTo(this.clipX+this.clipWidth,this.clipY+this.clipHeight).lineTo(this.clipX+this.clipWidth,this.clipY).lineTo(this.clipX,this.clipY);
    gMask.endFill();
    gMask.setStrokeStyle(1,"round").beginStroke('#fff').drawRect(this.clipX,this.clipY,this.clipWidth,this.clipHeight);
    gMask.endStroke();
    //text
    var hint= new createjs.Text("用手指编辑图片", "24px Arial", "rgba(255,255,255,0.7)");
    hint.textAlign="center";
    hint.x=this.stageWidth/2;
    hint.y=this.clipY-80;
    this.stage.addChild(hint);
    //btn1
    var cancel=new createjs.Text("取 消", "34px Arial", "#fff");
    cancel.textAlign="center";
    cancel.x=100;
    cancel.y=this.stageHeight-100;
    this.stage.addChild(cancel);
    this._hitArea(cancel,1.2);
    cancel.on('click',this.cancel,this,true);
    //btn2
    var complete=new createjs.Text("完 成", "34px Arial", "#fff");
    complete.textAlign="center";
    complete.x=this.stageWidth-100;
    complete.y=this.stageHeight-100;
    this.stage.addChild(complete);
    this._hitArea(complete,1.2);
    complete.on('click',this.complete,this,true);
    
    this.stage.update();
}
Photo.prototype.creatPhoto=function(img){
    this.photoBox.removeAllChildren();
    this.photo=new createjs.Bitmap(img);
    this.photoBox.addChild(this.photo);
    this.photo.regX=this.photo.image.width/2;
    this.photo.regY=this.photo.image.height/2;
    this.photo.x=this.stageWidth/2;
    this.photo.y=this.stageHeight/2;
    if(this.photo.image.width/this.photo.image.height>this.clipWidth/this.clipHeight){
        this.photo.scaleX=this.photo.scaleY=this.clipHeight/this.photo.image.height;
    }else{
        this.photo.scaleX=this.photo.scaleY=this.clipWidth/this.photo.image.width;
    };
    this.stage.update();
}
Photo.prototype.cancel=function(){
    this.canvas.remove();
    this.onCancel();
}
Photo.prototype.complete=function(){
    this.photoBox.cache(this.clipX,this.clipY,this.clipWidth,this.clipHeight);
    var base64=this.photoBox.cacheCanvas.toDataURL();
    this.photoBox.uncache();
    this.onComplete(base64);
    this.canvas.remove();
}
Photo.prototype._hitArea=function(o,scale){
    //设置感应区域
    var scale=scale||1;
    var bounds=o.getBounds();
    var hitArea=new createjs.Shape();
    hitArea.graphics.f('#f00').dr(0,0,bounds.width,bounds.height);
    var cx=bounds.width/2,cy=bounds.height/2;
    hitArea.set({scaleX:scale,scaleY:scale,regX:cx,regY:cy,x:cx+bounds.x,y:cy+bounds.y});
    o.hitArea=hitArea;
},
Photo.prototype._ctrl=function(){
    //元素手势控制
    var that=this;
    var minScale=0.2,maxScale=3,ir=0,ratio;
    
    var mc = new Hammer.Manager(this.canvas);
    mc.add(new Hammer.Pinch());
    mc.add(new Hammer.Rotate());
    mc.add(new Hammer.Pan());
    mc.add(new Hammer.Tap());
    mc.on('pinchstart rotatestart panstart', function (e) {
        if (!that.photo) return;
        ratio=that.canvas.width/that.canvas.clientWidth;
        that.photo.i_x = that.photo.x;
        that.photo.i_y = that.photo.y;
        that.photo.i_rotation = that.photo.rotation;
        that.photo.i_scale = that.photo.scaleX;
        ir = e.rotation;
    });

    mc.on('pinchmove rotatemove panmove', function (e) {
        if (!that.photo) return;
        that.photo.x = that.photo.i_x + e.deltaX*ratio;
        that.photo.y = that.photo.i_y + e.deltaY*ratio;
        var s = that.photo.i_scale + (e.scale - 1);
        if (s < minScale) s = minScale;
        else if(s>maxScale) s=maxScale;
        that.photo.scaleX = that.photo.scaleY = s;
        that.photo.rotation = that.photo.i_rotation + e.rotation - ir;
        that.stage.update();
    });
}