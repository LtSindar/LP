var NP = window.NP || {};
NP = function() {
    // Private

    // Карта
    this.map = {
        mapInstance: false,
        points: [],

        init: function(json) {
            this.json = json;
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
                    url: "/json.php",
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
                // Если не прошёл хотя бы один фильтр — не показываем точку
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
            e.preventDefault();

            $(".b-popup").fadeOut();
            this.$popup.fadeIn();

            //$("body").css({
            //    overflow: "hidden"
            //});
        };
        this.$trigger.on("touchstart, click", $.proxy(this.showPopup, this));
        this.$popup.find(".b-popup__close--js").on("touchstart, click", $.proxy(this.hideAll, this));

        this.hidePopup();
    };

    this.closePopup = function() {
        //$("body").css({
        //    overflow: "auto"
        //});
        $(".b-popup").fadeOut(function() {
            //$("body").css({
            //    overflow: "auto"
            //});
        });
        $(".b-popups__frame").fadeOut(function() {
            //$("body").css({
            //    overflow: "auto"
            //});
        });
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

            if( $(".b-popups__frame").size() > 0 ) {
                $(".b-popups__frame")[0].contentWindow.showPopup($(this).data("popup"));
                $(".b-popups__frame").fadeIn();
            }
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

//    $(".order-trigger--js").addClass("popup-trigger--js");
//    $(".popup-trigger--js").not(".popup-trigger-binded").each($.proxy(function(i, el) {
//        $(el).addClass("popup-trigger-binded");
//        var pp = new NP.popup(el);
//        $(".order-trigger--js").trigger("click");
//    }, this));
});