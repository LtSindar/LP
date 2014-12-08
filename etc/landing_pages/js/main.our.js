var NP = window.NP || {};
NP = function() {
    // Private
    
    this.target = '';
    
    // Карта
    this.map = {
        mapInstance: false,
        points: [],

        init: function(apiURL,json) {
            this.json = json;
            this.apiURL = apiURL;
            ymaps.ready($.proxy(this.renderMap, this));
        },

        renderMap: function() {
            this.mapInstance = new ymaps.Map('map', {
                center: [55.76, 37.64],
                zoom: 10,
                controls: ['geolocationControl', 'zoomControl']
            });
            this.mapInstance.events.add('wheel', function (e) {
                e.preventDefault();
            });
            this.processJson();
            this.bind();
        },

        geocode: function(string, zoom) {
            if( "undefined" === typeof zoom ) {
                zoom = 10;
            }

            var geocoder = ymaps.geocode( string );
            geocoder.then(
                $.proxy(function (res) {
                    this.mapInstance.setCenter( res.geoObjects.get(0).geometry.getCoordinates(), zoom );
                }, this)
            );
        },

        bind: function() {
            //  Фильтр городов
            $(".b-delivery__city--js").on("change", $.proxy(function(e) {
                $.ajax({
                    dataType: "json",
                    url: this.apiURL,
                    data:{'action':'getTotalDataByCity','city_id':$(".b-delivery__city--js").find("option:selected").val()},
                    success: $.proxy(function(json) {
                        this.json = json;
                        this.processJson();
                    }, this)
                });

                this.geocode( $(".b-delivery__city--js").find("option:selected").text() );
            }, this));
            //  Фильтр метро
            $(".b-delivery__subway--js").on("change", $.proxy(function() {
                this.geocode(
                    $(".b-delivery__city--js").find("option:selected").text() + " метро " + $(".b-delivery__subway--js").find("option:selected").text(),
                    14
                );
            }, this));
            //  Поиск по адресу
            $(".b-delivery__location--js").on("keypress", $.proxy(function(e) {
                if( e.keyCode == 13 ) {
                    this.geocode(
                        $(".b-delivery__city--js").find("option:selected").text() + " " + $(e.currentTarget).val(),
                        15
                    );
                };
            }, this));

            // Расширенный фильтр
            $(".b-delivery__filters__extend--js").on("click", function() {
                $(".b-delivery__filters--extended").slideToggle();
            });
            // Расширенные фильтры
            $(".b-delivery__delivery--js, .b-delivery__hours--js, .b-delivery__term--js").on("change", $.proxy(function() {
                this.filterPoints();
            }, this));
        },
        processJson: function() {
            // Города
            $(".b-delivery__city--js").html("");
            $.each( this.json.cities, $.proxy( function(i, el) {
                $(".b-delivery__city--js").append(
                    "<option value='" + el.id + "'>" + el.title + "</option>"
                );
            }, this ) );
            $(".b-delivery__city--js").val( this.json.city_id );

            // Метро
            if( "undefined" !== typeof this.json.subways && this.json.subways.length > 0 ) {
                $(".b-delivery__filter--subway").show();
                $(".b-delivery__subway--js").html("");
                $.each( this.json.subways, $.proxy( function(i, el) {
                    $(".b-delivery__subway--js").append(
                        "<option value='" + el.id + "'>" + el.title + "</option>"
                    );
                }, this ) );
            } else {
                $(".b-delivery__filter--subway").hide();
            }

            // Пункты
            this.renderPoints();
        },

        filterPoints: function() {
            this.removePoints();
            this.renderPoints();
        },
        renderPoints: function() {
            $.each( this.json.points, $.proxy( function(i, el) {
                // Расширенные фильтры
                var pass_filters = true;

                var filters = ["delivery", "term", "hours"];
                $.each(filters, function(index, filter_id) {
                    var filter = $(".b-delivery__" + filter_id + "--js").val();
                    if( filter !== "" ) {
                        if( "undefined" == typeof el[filter_id] || el[filter_id] != filter ) {
                            pass_filters = false;
                        }
                    }
                });
                // Если не прошёл хотя бы один фильтр — не показываем точку
                if ( ! pass_filters ) {
                    return true;
                }

                var point = new ymaps.Placemark([el.lat, el.lon], {
                    hintContent: el.title,

                    balloonContentHeader: el.title,
                    balloonContentBody: "Адрес: " + el.address
                });
                this.mapInstance.geoObjects.add(point);

                this.points.push( point );
            }, this ) );
        },
        removePoints: function() {
            $.each(this.points, $.proxy(function(i, el) {
                this.points[i].setParent(null);
            }, this));
            this.points = [];
        }
    };
    
/*START*/ 
    this.initIframe = function(frame_link){
        //Внутри попапа будет фрейм, который отвечает за авторизацию на соответствующем проекте  
        //Когда фрейм загрузится, он дернет этот метод, таким образом имеем тут линк на нужный нам фрейм
        NP.frame = frame_link;
    }
/*END*/ 

    // Правила акций
    this.freebookRules = function() {
        $(".js-freebook-rules").on("click", function(e) {
            e.preventDefault();

            var $el = $(this).find("span");

            var text = $el.text();
            $el.text( $el.data("text") );
            $el.data("text", text);

            $(".b-freebook__rules").slideToggle();
        });

        return this;
    };
    this.freebookRules = new this.freebookRules();

    // Popup
    this.popup = function(el) {
        this.$trigger = $(el);
        this.$popup = $( $(el).data("popup") );

        this.hidePopup = function(e) {
            if( e ) {
                e.preventDefault();
            }

            this.$popup.fadeOut();

            //$("body").css({
            //    overflow: "auto"
            //});
        };
        this.hideAll = function(e) {
            if( e ) {
                e.preventDefault();
            }
            this.hidePopup();
        };
        this.showPopup = function(e) {
            //Может быть вызван не через событие
            if( e ) {
                e.preventDefault();
            }

            $(".b-popup").fadeOut();
            this.$popup.fadeIn();

            //$("body").css({
            //    overflow: "hidden"
            //});
        };
/*START*/         
        //По клику на кнопку надо понять, нужно ли авторизовать пользователя (показывать попап)
        //или можно сразу переходить
        this.selectAction = function(e){
        
            if( e ) {
                e.preventDefault();
            }

            //Если пользователь САМ ничего не выбрал, то катимся на слайдер
            if(!NP.target){
                $("body,html").animate({
                    scrollTop: $(".b-slider").offset().top - 40 + "px"
                });
                return;
            }
            
            if(!NP.frame){
                console.log('Не доступен фрейм авторизации');
                return;
            } 

            if(!NP.frame.isAuth || typeof NP.frame.isAuth != 'function'){
                console.log('Не доступна авторизация');
                return;
            } 

            //Дергаем специальный метод в фрейме авторизации.
            //Сообщаем ему, что делать в случае авторизации и ее отсутствия.
            //В случае когда авторизации нет, откроется попап (o.showPopup();) и все авторизационные действия будут происходить в нем.
            //Когда пользователь авторизуется, фрейм дернет здешний NP.go(t);
            var o = this;
            console.log(o.showPopup);
            NP.frame.isAuth(//Auth
                function(NP){
                    return function(t){
                        NP.go(t);
                    }
                }(NP),
                function(){//Not Auth
                    o.showPopup();
                }
            );


        };

        //this.$trigger.on("touchstart, click", $.proxy(this.selectAction, this));//По клику надо выбрать, что делать дальше
        //this.$trigger.on("touchstart, click", $.proxy(this.showPopup, this));
/*END*/
        this.$popup.find(".b-popup__close--js").on("touchstart, click", $.proxy(this.hideAll, this));

        this.hidePopup();
    };
    //Здесь мы просто перезодим по целевой ссылке
    //При этом сама ссылка берется из NP.target
    //и к ней добавляется параметр t.
    //t - может быть авторизационным токеном для целевого проекта
    this.go = function(t,target){

        NP.closePopup();

        var target = target || NP.target || '';

        if(!target){
            console.log('Нет ссылки/функции для перехода');
        }

        if("function" == typeof target){
            console.log('target is function',target);
            target(t);
            return;
        }

        if(t){
            var hash = target.indexOf("#")==-1? '': target.substr(target.indexOf("#"));
            var href = target.substr(0, target.indexOf("#")) || target;

            target = href + (-1 !== target.indexOf("?") ? "&" : "/?") + t + hash;
        }
        console.log('location',target);

        var loc = location + '';
        if(loc.indexOf("#")>-1 && loc.substr(loc.indexOf("#")) === '#test'){
            return false;
        }

        location = target || '';

    };

    this.closePopup = function() {
        $(".b-popup").fadeOut();
        $(".b-popups__frame").fadeOut();
    };
    this.bindClosePopup = (function() {
        $(".b-popup__close--js").on("click", function(e) {
            e.preventDefault();

            parent.NP.closePopup();
        });
    })();

    this.bindShowPopup = (function() {
        $("body").on("click", ".popup-trigger--js", function(e) {
            e.preventDefault();
/*START*/   
            if(!NP.frame){
                console.log('Не доступен фрейм авторизации');
                return;
            } 

            if(!NP.frame.isAuth || typeof NP.frame.isAuth != 'function'){
                console.log('Не доступна авторизация');
                return;
            } 

            //Дергаем специальный метод в фрейме авторизации.
            //Сообщаем ему, что делать в случае авторизации и ее отсутствия.
            //В случае когда авторизации нет, откроется попап (o.showPopup();) и все авторизационные действия будут происходить в нем.
            //Когда пользователь авторизуется, фрейм дернет здешний NP.go(t);
            NP.frame.isAuth(//Auth
                function(NP){
                    return function(t){
                        NP.go(t);
                    }
                }(NP),
                function(className,frameClass){//Not Auth
                    if( $("."+frameClass).size() > 0 ) {
                        var frame = $("."+frameClass)[0];
                        
                        return function(){
                            frame.contentWindow.showPopup(className);
                            $(frame).fadeIn();
                        }
                    }else{
                        return function(){
                            console.log("frame not found");
                        }
                    }
                }($(this).data("popup"),'b-popups__frame')
            );

/*END*/   

//            if( $(".b-popups__frame").size() > 0 ) {
//                $(".b-popups__frame")[0].contentWindow.showPopup($(this).data("popup"));
//                $(".b-popups__frame").fadeIn();
//            }
        });
    })();
    this.showPopup = function(className) {
        //$(".b-popup").fadeOut();
        $(className).css({
            display: "block"
        });
    };

    // Slider
    this.slider = (function() {
        if( $(".b-slider").size() == 0 ) {
            return false;
        }

        $(".b-slider__item").first().addClass("current");

        $('.b-slider__items').slick({
            dots: false,
            infinite: true,
            arrows: false,
            speed: 600,
            slidesToShow: 4,
            slidesToScroll: 4,
            responsive: [
                {
                    breakpoint: 1000,
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 3   ,
                        infinite: true,
                        dots: false,
                        arrows: false,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        dots: false,
                        infinite: true,
                        arrows: false
                    }
                }
            ]
        });
		
        $(".b-slider__item").on("click", function() {
            $(".order-trigger--js").addClass("popup-trigger--js").removeClass("order-trigger--js");
            $(".popup-trigger--js").not(".popup-trigger-binded").each($.proxy(function(i, el) {
                $(el).addClass("popup-trigger-binded");
                new NP.popup(el);
            }, this));

//            if( $(".format-descriptor--js").size() == 0 ) {
//                $('<p class="b-subheading"></p>').insertBefore(".order-trigger--js");
//            }
            $(".format-descriptor--js").html(
                "Выбран формат <span>" + $(this).find(".b-format__title").text() + "</span> за <span>" + $(this).find(".b-format__price").text() + "</span>"
            );
            $(".format-descriptor--js").addClass("b-subheading--descriptor");
        });
        $("body").on("click", ".order-trigger--js", function(e) {
            e.preventDefault();
            $("html, body").animate({
                scrollTop: $(".order-trigger-to--js").offset().top + "px"
            });
        });

        $(".b-slider__nav__item--prev--js").on("click", function() {
            $('.b-slider__items').slickPrev();
        });
        $(".b-slider__nav__item--next--js").on("click", function() {
            $('.b-slider__items').slickNext();
        });
        $(".b-slider__item").on("click", function() {
            $(".b-slider__item").removeClass("current");
            $(this).addClass("current");
            var src = $(this).data("format");
/*START*/            
            //NP.target - выступает как буфер хранящий ссылку для перехода
            //$(".b-sample__format").data("target_url", $(this).data("target_url"));
            NP.target = $(this).data("target_url");
/*END*/  
            $(".b-sample__format").fadeOut(function() {
                $(this).html("");

                var $img = $("<img />");
                $img.attr("src", src);
                $(this).append($img);

                $(this).fadeIn();
            });
        });

        $(".b-follow").on("click", function() {
            $("body,html").animate({
                scrollTop: $(".b-slider").offset().top - 40 + "px"
            });
        });
		


        return true;
    })();

    // Checkbox
    this.checkbox = function(el) {
        this.$checkboxWrap = $(el);

        this.$checkboxIcon = this.$checkboxWrap.find(".b-icon");
        this.$checkboxInput = this.$checkboxWrap.find(".b-checkbox__input");
        this.$checkboxCustom = this.$checkboxWrap.find(".b-checkbox__custom");

        this.$checkboxWrap.on("touchend, click", $.proxy(function() {
            if( this.$checkboxInput.is(":checked") ) {
                this.$checkboxInput.prop('checked', false);
                this.$checkboxIcon.hide();
            } else {
                this.$checkboxInput.prop('checked', true);
                this.$checkboxIcon.show();
            }
        }, this));

        // Init
        this.$checkboxInput.addClass("hide");
        this.$checkboxCustom.addClass("show");

        if( this.$checkboxInput.is(":checked") ) {
            this.$checkboxIcon.show();
        } else {
            this.$checkboxIcon.hide();
        }
    };

    // Public
    return {
            popup: this.popup,
            freebookRules: this.freebookRules,
            map: this.map,
            checkbox: this.checkbox,
            closePopup: this.closePopup,
            showPopup: this.showPopup
/*START*/   ,initIframe:this.initIframe    
            ,go:this.go
            ,target:this.target
/*END*/         
    };
};

$(function() {
    FastClick.attach(document.body);
    window.NP = NP();

    $(".popup-trigger--js").not(".popup-trigger-binded").each($.proxy(function(i, el) {
        $(el).addClass("popup-trigger-binded");
        new NP.popup(el);
    }, this));
    $(".b-checkbox--js").each($.proxy(function(i, el) {
        new NP.checkbox(el);
    }, this));

//   $(".order-trigger--js").addClass("popup-trigger--js");
//    $(".popup-trigger--js").not(".popup-trigger-binded").each($.proxy(function(i, el) {
//       $(el).addClass("popup-trigger-binded");
//        var pp = new NP.popup(el);
//       $(".order-trigger--js").trigger("click");
//    }, this));
});



!function(t){var e={},s={mode:"horizontal",slideSelector:"",infiniteLoop:!0,hideControlOnEnd:!1,speed:500,easing:null,slideMargin:0,startSlide:0,randomStart:!1,captions:!1,ticker:!1,tickerHover:!1,adaptiveHeight:!1,adaptiveHeightSpeed:500,video:!1,useCSS:!0,preloadImages:"visible",responsive:!0,slideZIndex:50,touchEnabled:!0,swipeThreshold:50,oneToOneTouch:!0,preventDefaultSwipeX:!0,preventDefaultSwipeY:!1,pager:!0,pagerType:"full",pagerShortSeparator:" / ",pagerSelector:null,buildPager:null,pagerCustom:null,controls:!0,nextText:"",prevText:"",nextSelector:null,prevSelector:null,autoControls:!1,startText:"Start",stopText:"Stop",autoControlsCombine:!1,autoControlsSelector:null,auto:!1,pause:4e3,autoStart:!0,autoDirection:"next",autoHover:!1,autoDelay:0,minSlides:1,maxSlides:1,moveSlides:0,slideWidth:0,onSliderLoad:function(){},onSlideBefore:function(){},onSlideAfter:function(){},onSlideNext:function(){},onSlidePrev:function(){},onSliderResize:function(){}};t.fn.bxSlider=function(n){if(0==this.length)return this;if(this.length>1)return this.each(function(){t(this).bxSlider(n)}),this;var o={},r=this;e.el=this;var a=t(window).width(),l=t(window).height(),d=function(){o.settings=t.extend({},s,n),o.settings.slideWidth=parseInt(o.settings.slideWidth),o.children=r.children(o.settings.slideSelector),o.children.length<o.settings.minSlides&&(o.settings.minSlides=o.children.length),o.children.length<o.settings.maxSlides&&(o.settings.maxSlides=o.children.length),o.settings.randomStart&&(o.settings.startSlide=Math.floor(Math.random()*o.children.length)),o.active={index:o.settings.startSlide},o.carousel=o.settings.minSlides>1||o.settings.maxSlides>1,o.carousel&&(o.settings.preloadImages="all"),o.minThreshold=o.settings.minSlides*o.settings.slideWidth+(o.settings.minSlides-1)*o.settings.slideMargin,o.maxThreshold=o.settings.maxSlides*o.settings.slideWidth+(o.settings.maxSlides-1)*o.settings.slideMargin,o.working=!1,o.controls={},o.interval=null,o.animProp="vertical"==o.settings.mode?"top":"left",o.usingCSS=o.settings.useCSS&&"fade"!=o.settings.mode&&function(){var t=document.createElement("div"),e=["WebkitPerspective","MozPerspective","OPerspective","msPerspective"];for(var i in e)if(void 0!==t.style[e[i]])return o.cssPrefix=e[i].replace("Perspective","").toLowerCase(),o.animProp="-"+o.cssPrefix+"-transform",!0;return!1}(),"vertical"==o.settings.mode&&(o.settings.maxSlides=o.settings.minSlides),r.data("origStyle",r.attr("style")),r.children(o.settings.slideSelector).each(function(){t(this).data("origStyle",t(this).attr("style"))}),c()},c=function(){r.wrap('<div class="bx-wrapper"><div class="bx-viewport"></div></div>'),o.viewport=r.parent(),o.loader=t('<div class="bx-loading" />'),o.viewport.prepend(o.loader),r.css({width:"horizontal"==o.settings.mode?100*o.children.length+215+"%":"auto",position:"relative"}),o.usingCSS&&o.settings.easing?r.css("-"+o.cssPrefix+"-transition-timing-function",o.settings.easing):o.settings.easing||(o.settings.easing="swing"),f(),o.viewport.css({width:"100%",overflow:"hidden",position:"relative"}),o.viewport.parent().css({maxWidth:p()}),o.settings.pager||o.viewport.parent().css({margin:"0 auto 0px"}),o.children.css({"float":"horizontal"==o.settings.mode?"left":"none",listStyle:"none",position:"relative"}),o.children.css("width",u()),"horizontal"==o.settings.mode&&o.settings.slideMargin>0&&o.children.css("marginRight",o.settings.slideMargin),"vertical"==o.settings.mode&&o.settings.slideMargin>0&&o.children.css("marginBottom",o.settings.slideMargin),"fade"==o.settings.mode&&(o.children.css({position:"absolute",zIndex:0,display:"none"}),o.children.eq(o.settings.startSlide).css({zIndex:o.settings.slideZIndex,display:"block"})),o.controls.el=t('<div class="bx-controls" />'),o.settings.captions&&P(),o.active.last=o.settings.startSlide==x()-1,o.settings.video&&r.fitVids();var e=o.children.eq(o.settings.startSlide);"all"==o.settings.preloadImages&&(e=o.children),o.settings.ticker?o.settings.pager=!1:(o.settings.pager&&T(),o.settings.controls&&C(),o.settings.auto&&o.settings.autoControls&&E(),(o.settings.controls||o.settings.autoControls||o.settings.pager)&&o.viewport.after(o.controls.el)),g(e,h)},g=function(e,i){var s=e.find("img, iframe").length;if(0==s)return i(),void 0;var n=0;e.find("img, iframe").each(function(){t(this).one("load",function(){++n==s&&i()}).each(function(){this.complete&&t(this).load()})})},h=function(){if(o.settings.infiniteLoop&&"fade"!=o.settings.mode&&!o.settings.ticker){var e="vertical"==o.settings.mode?o.settings.minSlides:o.settings.maxSlides,i=o.children.slice(0,e).clone().addClass("bx-clone"),s=o.children.slice(-e).clone().addClass("bx-clone");r.append(i).prepend(s)}o.loader.remove(),S(),"vertical"==o.settings.mode&&(o.settings.adaptiveHeight=!0),o.viewport.height(v()),r.redrawSlider(),o.settings.onSliderLoad(o.active.index),o.initialized=!0,o.settings.responsive&&t(window).bind("resize",Z),o.settings.auto&&o.settings.autoStart&&H(),o.settings.ticker&&L(),o.settings.pager&&q(o.settings.startSlide),o.settings.controls&&W(),o.settings.touchEnabled&&!o.settings.ticker&&O()},v=function(){var e=0,s=t();if("vertical"==o.settings.mode||o.settings.adaptiveHeight)if(o.carousel){var n=1==o.settings.moveSlides?o.active.index:o.active.index*m();for(s=o.children.eq(n),i=1;i<=o.settings.maxSlides-1;i++)s=n+i>=o.children.length?s.add(o.children.eq(i-1)):s.add(o.children.eq(n+i))}else s=o.children.eq(o.active.index);else s=o.children;return"vertical"==o.settings.mode?(s.each(function(){e+=t(this).outerHeight()}),o.settings.slideMargin>0&&(e+=o.settings.slideMargin*(o.settings.minSlides-1))):e=Math.max.apply(Math,s.map(function(){return t(this).outerHeight(!1)}).get()),e},p=function(){var t="100%";return o.settings.slideWidth>0&&(t="horizontal"==o.settings.mode?o.settings.maxSlides*o.settings.slideWidth+(o.settings.maxSlides-1)*o.settings.slideMargin:o.settings.slideWidth),t},u=function(){var t=o.settings.slideWidth,e=o.viewport.width();return 0==o.settings.slideWidth||o.settings.slideWidth>e&&!o.carousel||"vertical"==o.settings.mode?t=e:o.settings.maxSlides>1&&"horizontal"==o.settings.mode&&(e>o.maxThreshold||e<o.minThreshold&&(t=(e-o.settings.slideMargin*(o.settings.minSlides-1))/o.settings.minSlides)),t},f=function(){var t=1;if("horizontal"==o.settings.mode&&o.settings.slideWidth>0)if(o.viewport.width()<o.minThreshold)t=o.settings.minSlides;else if(o.viewport.width()>o.maxThreshold)t=o.settings.maxSlides;else{var e=o.children.first().width();t=Math.floor(o.viewport.width()/e)}else"vertical"==o.settings.mode&&(t=o.settings.minSlides);return t},x=function(){var t=0;if(o.settings.moveSlides>0)if(o.settings.infiniteLoop)t=o.children.length/m();else for(var e=0,i=0;e<o.children.length;)++t,e=i+f(),i+=o.settings.moveSlides<=f()?o.settings.moveSlides:f();else t=Math.ceil(o.children.length/f());return t},m=function(){return o.settings.moveSlides>0&&o.settings.moveSlides<=f()?o.settings.moveSlides:f()},S=function(){if(o.children.length>o.settings.maxSlides&&o.active.last&&!o.settings.infiniteLoop){if("horizontal"==o.settings.mode){var t=o.children.last(),e=t.position();b(-(e.left-(o.viewport.width()-t.width())),"reset",0)}else if("vertical"==o.settings.mode){var i=o.children.length-o.settings.minSlides,e=o.children.eq(i).position();b(-e.top,"reset",0)}}else{var e=o.children.eq(o.active.index*m()).position();o.active.index==x()-1&&(o.active.last=!0),void 0!=e&&("horizontal"==o.settings.mode?b(-e.left,"reset",0):"vertical"==o.settings.mode&&b(-e.top,"reset",0))}},b=function(t,e,i,s){if(o.usingCSS){var n="vertical"==o.settings.mode?"translate3d(0, "+t+"px, 0)":"translate3d("+t+"px, 0, 0)";r.css("-"+o.cssPrefix+"-transition-duration",i/1e3+"s"),"slide"==e?(r.css(o.animProp,n),r.bind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd",function(){r.unbind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd"),D()})):"reset"==e?r.css(o.animProp,n):"ticker"==e&&(r.css("-"+o.cssPrefix+"-transition-timing-function","linear"),r.css(o.animProp,n),r.bind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd",function(){r.unbind("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd"),b(s.resetValue,"reset",0),N()}))}else{var a={};a[o.animProp]=t,"slide"==e?r.animate(a,i,o.settings.easing,function(){D()}):"reset"==e?r.css(o.animProp,t):"ticker"==e&&r.animate(a,speed,"linear",function(){b(s.resetValue,"reset",0),N()})}},w=function(){for(var e="",i=x(),s=0;i>s;s++){var n="";o.settings.buildPager&&t.isFunction(o.settings.buildPager)?(n=o.settings.buildPager(s),o.pagerEl.addClass("bx-custom-pager")):(n=s+1,o.pagerEl.addClass("bx-default-pager")),e+='<div class="bx-pager-item"><a href="" data-slide-index="'+s+'" class="bx-pager-link">'+n+"</a></div>"}o.pagerEl.html(e)},T=function(){o.settings.pagerCustom?o.pagerEl=t(o.settings.pagerCustom):(o.pagerEl=t('<div class="bx-pager" />'),o.settings.pagerSelector?t(o.settings.pagerSelector).html(o.pagerEl):o.controls.el.addClass("bx-has-pager").append(o.pagerEl),w()),o.pagerEl.on("click","a",I)},C=function(){o.controls.next=t('<a class="bx-next" href="">'+o.settings.nextText+"</a>"),o.controls.prev=t('<a class="bx-prev" href="">'+o.settings.prevText+"</a>"),o.controls.next.bind("click",y),o.controls.prev.bind("click",z),o.settings.nextSelector&&t(o.settings.nextSelector).append(o.controls.next),o.settings.prevSelector&&t(o.settings.prevSelector).append(o.controls.prev),o.settings.nextSelector||o.settings.prevSelector||(o.controls.directionEl=t('<div class="bx-controls-direction" />'),o.controls.directionEl.append(o.controls.prev).append(o.controls.next),o.controls.el.addClass("bx-has-controls-direction").append(o.controls.directionEl))},E=function(){o.controls.start=t('<div class="bx-controls-auto-item"><a class="bx-start" href="">'+o.settings.startText+"</a></div>"),o.controls.stop=t('<div class="bx-controls-auto-item"><a class="bx-stop" href="">'+o.settings.stopText+"</a></div>"),o.controls.autoEl=t('<div class="bx-controls-auto" />'),o.controls.autoEl.on("click",".bx-start",k),o.controls.autoEl.on("click",".bx-stop",M),o.settings.autoControlsCombine?o.controls.autoEl.append(o.controls.start):o.controls.autoEl.append(o.controls.start).append(o.controls.stop),o.settings.autoControlsSelector?t(o.settings.autoControlsSelector).html(o.controls.autoEl):o.controls.el.addClass("bx-has-controls-auto").append(o.controls.autoEl),A(o.settings.autoStart?"stop":"start")},P=function(){o.children.each(function(){var e=t(this).find("img:first").attr("title");void 0!=e&&(""+e).length&&t(this).append('<div class="bx-caption"><span>'+e+"</span></div>")})},y=function(t){o.settings.auto&&r.stopAuto(),r.goToNextSlide(),t.preventDefault()},z=function(t){o.settings.auto&&r.stopAuto(),r.goToPrevSlide(),t.preventDefault()},k=function(t){r.startAuto(),t.preventDefault()},M=function(t){r.stopAuto(),t.preventDefault()},I=function(e){o.settings.auto&&r.stopAuto();var i=t(e.currentTarget),s=parseInt(i.attr("data-slide-index"));s!=o.active.index&&r.goToSlide(s),e.preventDefault()},q=function(e){var i=o.children.length;return"short"==o.settings.pagerType?(o.settings.maxSlides>1&&(i=Math.ceil(o.children.length/o.settings.maxSlides)),o.pagerEl.html(e+1+o.settings.pagerShortSeparator+i),void 0):(o.pagerEl.find("a").removeClass("active"),o.pagerEl.each(function(i,s){t(s).find("a").eq(e).addClass("active")}),void 0)},D=function(){if(o.settings.infiniteLoop){var t="";0==o.active.index?t=o.children.eq(0).position():o.active.index==x()-1&&o.carousel?t=o.children.eq((x()-1)*m()).position():o.active.index==o.children.length-1&&(t=o.children.eq(o.children.length-1).position()),t&&("horizontal"==o.settings.mode?b(-t.left,"reset",0):"vertical"==o.settings.mode&&b(-t.top,"reset",0))}o.working=!1,o.settings.onSlideAfter(o.children.eq(o.active.index),o.oldIndex,o.active.index)},A=function(t){o.settings.autoControlsCombine?o.controls.autoEl.html(o.controls[t]):(o.controls.autoEl.find("a").removeClass("active"),o.controls.autoEl.find("a:not(.bx-"+t+")").addClass("active"))},W=function(){1==x()?(o.controls.prev.addClass("disabled"),o.controls.next.addClass("disabled")):!o.settings.infiniteLoop&&o.settings.hideControlOnEnd&&(0==o.active.index?(o.controls.prev.addClass("disabled"),o.controls.next.removeClass("disabled")):o.active.index==x()-1?(o.controls.next.addClass("disabled"),o.controls.prev.removeClass("disabled")):(o.controls.prev.removeClass("disabled"),o.controls.next.removeClass("disabled")))},H=function(){o.settings.autoDelay>0?setTimeout(r.startAuto,o.settings.autoDelay):r.startAuto(),o.settings.autoHover&&r.hover(function(){o.interval&&(r.stopAuto(!0),o.autoPaused=!0)},function(){o.autoPaused&&(r.startAuto(!0),o.autoPaused=null)})},L=function(){var e=0;if("next"==o.settings.autoDirection)r.append(o.children.clone().addClass("bx-clone"));else{r.prepend(o.children.clone().addClass("bx-clone"));var i=o.children.first().position();e="horizontal"==o.settings.mode?-i.left:-i.top}b(e,"reset",0),o.settings.pager=!1,o.settings.controls=!1,o.settings.autoControls=!1,o.settings.tickerHover&&!o.usingCSS&&o.viewport.hover(function(){r.stop()},function(){var e=0;o.children.each(function(){e+="horizontal"==o.settings.mode?t(this).outerWidth(!0):t(this).outerHeight(!0)});var i=o.settings.speed/e,s="horizontal"==o.settings.mode?"left":"top",n=i*(e-Math.abs(parseInt(r.css(s))));N(n)}),N()},N=function(t){speed=t?t:o.settings.speed;var e={left:0,top:0},i={left:0,top:0};"next"==o.settings.autoDirection?e=r.find(".bx-clone").first().position():i=o.children.first().position();var s="horizontal"==o.settings.mode?-e.left:-e.top,n="horizontal"==o.settings.mode?-i.left:-i.top,a={resetValue:n};b(s,"ticker",speed,a)},O=function(){o.touch={start:{x:0,y:0},end:{x:0,y:0}},o.viewport.bind("touchstart",X)},X=function(t){if(o.working)t.preventDefault();else{o.touch.originalPos=r.position();var e=t.originalEvent;o.touch.start.x=e.changedTouches[0].pageX,o.touch.start.y=e.changedTouches[0].pageY,o.viewport.bind("touchmove",Y),o.viewport.bind("touchend",V)}},Y=function(t){var e=t.originalEvent,i=Math.abs(e.changedTouches[0].pageX-o.touch.start.x),s=Math.abs(e.changedTouches[0].pageY-o.touch.start.y);if(3*i>s&&o.settings.preventDefaultSwipeX?t.preventDefault():3*s>i&&o.settings.preventDefaultSwipeY&&t.preventDefault(),"fade"!=o.settings.mode&&o.settings.oneToOneTouch){var n=0;if("horizontal"==o.settings.mode){var r=e.changedTouches[0].pageX-o.touch.start.x;n=o.touch.originalPos.left+r}else{var r=e.changedTouches[0].pageY-o.touch.start.y;n=o.touch.originalPos.top+r}b(n,"reset",0)}},V=function(t){o.viewport.unbind("touchmove",Y);var e=t.originalEvent,i=0;if(o.touch.end.x=e.changedTouches[0].pageX,o.touch.end.y=e.changedTouches[0].pageY,"fade"==o.settings.mode){var s=Math.abs(o.touch.start.x-o.touch.end.x);s>=o.settings.swipeThreshold&&(o.touch.start.x>o.touch.end.x?r.goToNextSlide():r.goToPrevSlide(),r.stopAuto())}else{var s=0;"horizontal"==o.settings.mode?(s=o.touch.end.x-o.touch.start.x,i=o.touch.originalPos.left):(s=o.touch.end.y-o.touch.start.y,i=o.touch.originalPos.top),!o.settings.infiniteLoop&&(0==o.active.index&&s>0||o.active.last&&0>s)?b(i,"reset",200):Math.abs(s)>=o.settings.swipeThreshold?(0>s?r.goToNextSlide():r.goToPrevSlide(),r.stopAuto()):b(i,"reset",200)}o.viewport.unbind("touchend",V)},Z=function(){var e=t(window).width(),i=t(window).height();(a!=e||l!=i)&&(a=e,l=i,r.redrawSlider(),o.settings.onSliderResize.call(r,o.active.index))};return r.goToSlide=function(e,i){if(!o.working&&o.active.index!=e)if(o.working=!0,o.oldIndex=o.active.index,o.active.index=0>e?x()-1:e>=x()?0:e,o.settings.onSlideBefore(o.children.eq(o.active.index),o.oldIndex,o.active.index),"next"==i?o.settings.onSlideNext(o.children.eq(o.active.index),o.oldIndex,o.active.index):"prev"==i&&o.settings.onSlidePrev(o.children.eq(o.active.index),o.oldIndex,o.active.index),o.active.last=o.active.index>=x()-1,o.settings.pager&&q(o.active.index),o.settings.controls&&W(),"fade"==o.settings.mode)o.settings.adaptiveHeight&&o.viewport.height()!=v()&&o.viewport.animate({height:v()},o.settings.adaptiveHeightSpeed),o.children.filter(":visible").fadeOut(o.settings.speed).css({zIndex:0}),o.children.eq(o.active.index).css("zIndex",o.settings.slideZIndex+1).fadeIn(o.settings.speed,function(){t(this).css("zIndex",o.settings.slideZIndex),D()});else{o.settings.adaptiveHeight&&o.viewport.height()!=v()&&o.viewport.animate({height:v()},o.settings.adaptiveHeightSpeed);var s=0,n={left:0,top:0};if(!o.settings.infiniteLoop&&o.carousel&&o.active.last)if("horizontal"==o.settings.mode){var a=o.children.eq(o.children.length-1);n=a.position(),s=o.viewport.width()-a.outerWidth()}else{var l=o.children.length-o.settings.minSlides;n=o.children.eq(l).position()}else if(o.carousel&&o.active.last&&"prev"==i){var d=1==o.settings.moveSlides?o.settings.maxSlides-m():(x()-1)*m()-(o.children.length-o.settings.maxSlides),a=r.children(".bx-clone").eq(d);n=a.position()}else if("next"==i&&0==o.active.index)n=r.find("> .bx-clone").eq(o.settings.maxSlides).position(),o.active.last=!1;else if(e>=0){var c=e*m();n=o.children.eq(c).position()}if("undefined"!=typeof n){var g="horizontal"==o.settings.mode?-(n.left-s):-n.top;b(g,"slide",o.settings.speed)}}},r.goToNextSlide=function(){if(o.settings.infiniteLoop||!o.active.last){var t=parseInt(o.active.index)+1;r.goToSlide(t,"next")}},r.goToPrevSlide=function(){if(o.settings.infiniteLoop||0!=o.active.index){var t=parseInt(o.active.index)-1;r.goToSlide(t,"prev")}},r.startAuto=function(t){o.interval||(o.interval=setInterval(function(){"next"==o.settings.autoDirection?r.goToNextSlide():r.goToPrevSlide()},o.settings.pause),o.settings.autoControls&&1!=t&&A("stop"))},r.stopAuto=function(t){o.interval&&(clearInterval(o.interval),o.interval=null,o.settings.autoControls&&1!=t&&A("start"))},r.getCurrentSlide=function(){return o.active.index},r.getCurrentSlideElement=function(){return o.children.eq(o.active.index)},r.getSlideCount=function(){return o.children.length},r.redrawSlider=function(){o.children.add(r.find(".bx-clone")).outerWidth(u()),o.viewport.css("height",v()),o.settings.ticker||S(),o.active.last&&(o.active.index=x()-1),o.active.index>=x()&&(o.active.last=!0),o.settings.pager&&!o.settings.pagerCustom&&(w(),q(o.active.index))},r.destroySlider=function(){o.initialized&&(o.initialized=!1,t(".bx-clone",this).remove(),o.children.each(function(){void 0!=t(this).data("origStyle")?t(this).attr("style",t(this).data("origStyle")):t(this).removeAttr("style")}),void 0!=t(this).data("origStyle")?this.attr("style",t(this).data("origStyle")):t(this).removeAttr("style"),t(this).unwrap().unwrap(),o.controls.el&&o.controls.el.remove(),o.controls.next&&o.controls.next.remove(),o.controls.prev&&o.controls.prev.remove(),o.pagerEl&&o.settings.controls&&o.pagerEl.remove(),t(".bx-caption",this).remove(),o.controls.autoEl&&o.controls.autoEl.remove(),clearInterval(o.interval),o.settings.responsive&&t(window).unbind("resize",Z))},r.reloadSlider=function(t){void 0!=t&&(n=t),r.destroySlider(),d()},d(),this}}(jQuery);
  
$(document).ready(function(){
    $('.bxslider').bxSlider({
      pagerCustom: '#bx-pager'
    });
    
    $('.js-zeroclipboard-target').each(function(){
        var client = new ZeroClipboard( this );
        client.on( "ready", function( readyEvent ) {
             //alert( "ZeroClipboard SWF is ready!" );
            client.on( "aftercopy", function( event ) {
              // `this` === `client`
              // `event.target` === the element that was clicked
              //event.target.style.display = "none";
              //alert("Copied text to clipboard: " + event.data["text/plain"] );
              alert("Скопировано в буфер");
            });
        });
    });
});