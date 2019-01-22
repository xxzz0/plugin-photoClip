function Photo(){
    this.src=null;
    this.clipWidth=500;//裁剪宽度
    this.clipHeight=400;//裁剪高度
    this.stageWidth=750;
    this.stageHeight=null;
    this.type=null;//需保存的图片格式
    this.encoderOptions=null;//图片质量 0 ~ 1
    
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
    complete.mouseEnabled=false;
    complete.textAlign="center";
    complete.x=this.stageWidth-100;
    complete.y=this.stageHeight-100;
    this.stage.addChild(complete);
    this._hitArea(complete,1.2);
    complete.on('click',this.complete,this,true);

    //photo
    this.repair(this.src,function(image){
        that.creatPhoto.call(that,image);
        complete.mouseEnabled=true;
    });
    
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
    this.photo.minScale=this.photo.scaleX;
    this.photo.maxScale=this.photo.scaleX*2;
    this.stage.update();
}
Photo.prototype.cancel=function(){
    this.canvas.remove();
    this.onCancel();
}
Photo.prototype.complete=function(){
    this.photoBox.cache(this.clipX,this.clipY,this.clipWidth,this.clipHeight);
    var base64=this.photoBox.cacheCanvas.toDataURL(this.type,this.encoderOptions);
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
}
Photo.prototype._ctrl=function(){
    //元素手势控制
    var that=this;
    var ratio;
    
    var mc = new Hammer.Manager(this.canvas);
    mc.add(new Hammer.Pinch());
    mc.add(new Hammer.Rotate());
    mc.add(new Hammer.Pan());
    mc.add(new Hammer.Tap());
    var mc_x=0,mc_y=0,mc_scale=0;
    mc.on('pinchstart rotatestart panstart', function (e) {
        if (!that.photo) return;
        ratio=that.canvas.width/that.canvas.clientWidth;
        that.photo.i_x = that.photo.x;
        that.photo.i_y = that.photo.y;
        that.photo.i_scale = that.photo.scaleX;
        mc_x=0;
        mc_y=0;
        mc_scale=1;
    });

    mc.on('pinchmove rotatemove panmove', function (e) {
        if (!that.photo) return;

        //缩放
        var minScale=that.photo.minScale,
            maxScale=that.photo.maxScale;
        var s = that.photo.i_scale + (e.scale-mc_scale);
        if(s>=minScale&&s<=maxScale){
            that.photo.scaleX = that.photo.scaleY = s;
        }else{
            mc_scale=e.scale;
            if (s < minScale){
                that.photo.scaleX = that.photo.scaleY=that.photo.i_scale=minScale;
            }else if(s>maxScale){
                that.photo.scaleX = that.photo.scaleY=that.photo.i_scale=maxScale;
            }
        };

        //计算边界
        var w=that.photo.image.width*that.photo.scaleX,
            h=that.photo.image.height*that.photo.scaleX;
        var maxY=that.clipY,
            minY=that.clipY-(h-that.clipHeight),
            maxX=that.clipX,
            minX=that.clipX-(w-that.clipWidth);

        //移动
        var x=that.photo.i_x + (e.deltaX-mc_x)*ratio,
            y=that.photo.i_y + (e.deltaY-mc_y)*ratio;
        //图片坐标转为左上角坐标
        var x0=x-w/2,
            y0=y-h/2;
        //限制x坐标
        if(x0>=minX&&x0<=maxX){
            that.photo.x=x;
        }else{
            mc_x=e.deltaX;
            if(x0<minX){
                that.photo.x=that.photo.i_x=minX+w/2;
            }else if(x0>maxX){
                that.photo.x=that.photo.i_x=maxX+w/2;
            };
        };
        //限制y坐标
        if(y0>=minY&&y0<=maxY){
            that.photo.y=y;
        }else{
            mc_y=e.deltaY;
            if(y0<minY){
                that.photo.y=that.photo.i_y=minY+h/2;
            }else if(y0>maxY){
                that.photo.y=that.photo.i_y=maxY+h/2;
            };
        };

        that.stage.update();
    });
}
Photo.prototype.repair=function(src,callback){
    //拍照方向修复
    var maxSize=1000;//最大尺寸
    var img=new Image();
    img.src=src;
    var orientation;
    img.onload=function(){
        img.onload=null;
        EXIF.getData(img, function(){
            orientation=EXIF.getTag(img, 'Orientation')||1;
            fn();
        });
    }
    function fn(){
        var rotation,width,height,scale=1;
        switch(orientation) {
            case 3:
                width=img.width;
                height=img.height;
                rotation = 180;
                break;
            case 6:
                width=img.height;
                height=img.width;
                rotation = 90;
                break;
            case 8:
                width=img.height;
                height=img.width;
                rotation = 270;
                break;
            default:
                width=img.width;
                height=img.height;
                rotation=0;
        }
        var ratio=width/height;
        if(ratio>1){
            if(width>maxSize){
                scale=maxSize/width;
                width=maxSize;
                height=width/ratio;
            }
        }else{
            if(height>maxSize){
                scale=maxSize/height;
                height=maxSize;
                width=height*ratio;
            }
        };
        var canvas=document.createElement('canvas');
        canvas.width=width;
        canvas.height=height;
        var stage=new createjs.Stage(canvas);
        var o=new createjs.Bitmap(img);
        o.regX=o.image.width/2;
        o.regY=o.image.height/2;
        o.x=width/2;
        o.y=height/2;
        o.scaleX=o.scaleY=scale;
        o.rotation=rotation;
        stage.addChild(o);
        stage.update();
        if(callback) callback(canvas);
    }
}