/**
  * LC Lightbox - LITE
  * yet.. another jQuery lightbox.. or not?
  *
  * @version	: 	2.0.2
  * @copyright	:	Luca Montanari (LCweb)
  * @website	:	https://lcweb.it
  * @requires	:	jQuery v1.7 or later
  
  * Released under the MIT license
  */
 
(function ($) {
	lcl_objs 		= []; // array containing all initialized objects - useful for deeplinks
	
	lcl_shown 		= false; // know whether lightbox is shown
	lcl_is_active 	= false; // true when lightbox systems are acting (disable triggers)
	lcl_slideshow	= undefined; // lightbox slideshow - setInterval object
	lcl_on_mobile   = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
	
	// static vars avoiding useless parameters usage - related to currently opened lightbox - otherwise they are empty
	lcl_curr_obj	= false; // store currently active object 
	lcl_curr_opts 	= false; // currently active instance settings
	lcl_curr_vars 	= false; // currently active instance settings
	
	lcl_hashless_url	= false; // page URL without eventual hashes
	lcl_url_hash		= ''; // URL hashtag
	
	
	// lightbox structure
	let lb_code =
	'<div id="lcl_wrap" class="lcl_pre_show lcl_pre_first_el lcl_first_sizing lcl_is_resizing">'+
		'<div id="lcl_window">'+
			'<a href="javascript:void(0);" id="lcl_corner_close" title="close" aria-label="close" tabindex="300"></a>'+
			'<div id="lcl_loader" class="lcl_loader_pre_first_el"><span id="lcll_1"></span><span id="lcll_2"></span></div>'+
			'<div id="lcl_nav_cmd">'+
				'<button class="lcl_icon lcl_prev" title="previous" aria-label="previous" tabindex="10"></button>'+
				'<button class="lcl_icon lcl_play" title="play/pause" aria-label="play/pause" tabindex="20"></button>'+
				'<button class="lcl_icon lcl_next" title="next" aria-label="next" tabindex="30"></button>'+
				'<div class="lcl_icon lcl_counter"></div>'+

				'<button class="lcl_icon lcl_right_icon lcl_close" title="close" tabindex="300"></button>'+
				
				'<button class="lcl_icon lcl_right_icon lcl_fullscreen" title="toggle fullscreen" aria-label="toggle fullscreen" tabindex="100"></button>'+
				'<button class="lcl_icon lcl_right_icon lcl_txt_toggle" title="toggle text" aria-label="toggle text" tabindex="90"></button>'+
				'<button class="lcl_icon lcl_right_icon lcl_download" title="download" aria-label="download" tabindex="80"></button>'+
				'<button class="lcl_icon lcl_right_icon lcl_thumbs_toggle" title="toggle thumbnails" aria-label="toggle thumbnails" tabindex="70"></button>'+
				'<button class="lcl_icon lcl_right_icon lcl_socials" title="toggle socials" aria-label="toggle socials" tabindex="60"></button>'+
			'</div>'+
			'<div id="lcl_contents_wrap">'+
				'<div id="lcl_subj">'+
					'<div id="lcl_elem_wrap"></div>'+
				'</div>'+
				'<div id="lcl_txt"></div>'+
			'</div>'+	
		'</div>'+
		'<div id="lcl_thumbs_nav" class="lcl_pre_tn_scroll"></div>'+
		'<div id="lcl_overlay"></div>'+
	'</div>';
	
	
	////////////////////////////////////////////////////////////////////
	
	
	// initialization
	// obj can be an array and overrides elements / [src: url/selector (only required data), title: (string), txt: (string), author: (string), ajax: bool, type: image/frame/text] 
	lc_lightbox = function(obj, lcl_settings) {
		if(typeof(obj) != 'string' && (typeof(obj) != 'object' || !obj.length)) {
            return false;
        }

		// check among already initialized 
		let already_init = false;
		$.each(lcl_objs, function(i, v) {
			if(JSON.stringify(v) == JSON.stringify(obj)) {
				already_init = v;
				return false;
			}
		});
		
		if(already_init === false) {
			const instance = new lcl(obj, lcl_settings);
			lcl_objs.push(instance);	
			return instance;
		}

		return already_init;
	};	
	
	
	
	// destruct method
	lcl_destroy = function(instance) {
		const index = $.inArray(instance, lcl_objs);
		
		if(index !== -1) {
			lcl_objs.splice(index, 1);
		}
	};
	
	
	////////////////////////////////////////////////////////////////////
	

	/* initialize */
	const lcl = function(obj, settings) {

		let lcl_settings = $.extend({
			gallery			: true, // whether to display a single element or compose a gallery
			gallery_hook	: 'rel', // attribute grouping elements - use false to create a gallery with all fetched elements 
			live_elements	: true, // if a selector is found, set true to handle automatically DOM changes
			preload_all		: false, // whether to preload all images on document ready
			global_type		: 'image', // force elements type
			
			src_attr		: 'href', // attribute containing element's source
			title_attr		: 'title', // attribute containing the title - is possible to specify a selector with this syntax: "> .selector" or "> span" 
			txt_attr		: 'data-lcl-txt', // attribute containing the description - is possible to specify a selector with this syntax: "> .selector" or "> span" 
			author_attr		: 'data-lcl-author', // attribute containing the author - is possible to specify a selector with this syntax: "> .selector" or "> span" 
			author_by_txt   : 'by', // which text is used before the author name, by default is "by"
            
			slideshow		: true, // whether to enable slideshow
			open_close_time	: 400, // animation duration for lightbox opening and closing / 1000 = 1sec
			ol_time_diff	: 100, // overlay's animation advance (on opening) and delay (on close) to window / 1000 = sec
			fading_time		: 80, // elements fading animation duration in millisecods / 1000 = 1sec
			animation_time	: 250, // sizing animation duration in millisecods / 1000 = 1sec
			slideshow_time	: 6000, // slideshow interval duration in milliseconds / 1000 = 1sec
			autoplay		: false, // autoplay slideshow - bool
			counter			: false, // whether to display elements counter
			progressbar		: true, // whether to display a progressbar when slideshow runs
			carousel 		: true, // whether to create a non-stop pagination cycling elements
			
			max_width		: '93%', // Lightbox maximum width. Use a responsive percent value or an integer for static pixel value
			max_height		: '93%', // Lightbox maximum height. Use a responsive percent value or an integer for static pixel value
			wrap_padding	: false, // set lightbox wrapping padding. Useful to maintain spaces using px max-sizes. Use a CSS value (string)
			ol_opacity		: 0.7, // overlay opacity / value between 0 and 1
			ol_color		: '#111', // background color of the overlay
			ol_pattern		: false, // overlay patterns - insert the pattern name or false
			border_w		: 0, // width of the lightbox border in pixels 
			border_col		: '#ddd', // color of the lightbox border
			padding			: 0, // width of the lightbox padding in pixels
			radius			: 0, // lightbox border radius in pixels 
			shadow			: true, // whether to apply a shadow around lightbox window
			remove_scrollbar: true, // whether to hide page's vertical scroller
			
			wrap_class		: '', // custom classes added to wrapper - for custom styling/tracking
			skin			: 'light', // light / dark / custom
			data_position	: 'over', // over / under / lside / rside	
			cmd_position	: 'inner', // inner / outer	
			ins_close_pos	: 'normal', // set closing button position for inner commands - normal/corner	
			nav_btn_pos		: 'normal', // set arrows and play/pause position - normal/middle
	
			txt_hidden		: 500, // whether to hide texts on lightbox opening - bool or int (related to browser's smaller side)
			show_title		: true, // bool / whether to display titles
			show_descr		: true, // bool / whether to display descriptions
			show_author		: true, // bool / whether to display authors
			
			thumbs_nav		: true, // enables thumbnails navigation (requires elements poster or images)
			tn_icons		: true, // print type icons on thumbs if types are mixed
			tn_hidden		: 500, // whether to hide thumbs nav on lightbox opening - bool or int (related to browser's smaller side)
			thumbs_w		: 110, // width of the thumbs for the standard lightbox
			thumbs_h		: 110, // height of the thumbs for the standard lightbox
			thumb_attr		: false, // attribute containing thumb URL to use or false to use thumbs maker
			thumbs_maker_url: false, // script baseurl to create thumbnails (use src=%URL% w=%W% h=%H%)
			
			fullscreen		: false, // Allow the user to expand a resized image. true/false
			fs_img_behavior	: 'fit', // resize mode of the fullscreen image - smart/fit/fill
			fs_only			: 500, // when directly open in fullscreen mode - bool or int (related to browser's smaller side)
			browser_fs_mode : true, // whether to trigger or nor browser fullscreen mode
			
			socials			: false, // bool
			fb_share_params	: false, // bool/string / whether to use direct FB contents share (Read the doc to know what to use)
			
			txt_toggle_cmd	: true, // bool / allow text hiding
			download		: false, // bool / whether to add download button
			touchswipe		: true, // bool / Allow touch interactions for mobile
			mousewheel		: true, // bool / Allow elements navigation with mousewheel
			modal			: false, // enable modal mode (no closing on overlay click)
			rclick_prevent	: false, // whether to avoid right click on lightbox
		
			elems_parsed 	: function() {},
			html_is_ready 	: function() {},
			on_open			: function() {},
			on_elem_switch	: function() {},
			slideshow_start	: function() {},
			slideshow_end	: function() {},
			on_fs_enter		: function() {},
			on_fs_exit		: function() {},
			on_close		: function() {},
			
		}, settings);


		// Variables accessible globally
		let lcl_vars = {
			elems 			: [], // elements object / src: url/text (only required data), title: (string), descr: (string), author: (string), type: image/iframe/text 
			is_arr_instance	: (typeof(obj) != 'string' && typeof(obj[0].childNodes) == 'undefined') ? true : false,	// true if lightbox is initialized usign direct array immission
			elems_count		: (typeof(obj) != 'string' && typeof(obj[0].childNodes) == 'undefined') ? obj.length : $(obj).length, // elements count at the moment of lb initialization
			elems_selector	: (typeof(obj) == 'string') ? obj : false, // elements selector - used for dynamic elements fetching
			elem_index 		: false, // current element index
			gallery_hook_val: false, // gallery hook value - to discard other ones
			preload_all_used: false, // flag to know when complete preload on document's ready has been triggered
			img_sizes_cache : [], // store image sizes after their preload - index is images index

			inner_cmd_w		: false, // store inner commands width for inner->outer switch 
			txt_exists 		: false, // any text exists in current element?
			txt_und_sizes	: false, // custom lb sizes after text under calculation 
			force_fullscreen: false, // flag to know whether to simulate "always fs" for small screens
			html_style		: '', // html tag style (for scrollbar hiding)
			body_style		: '', // body tag style (for scrollbar hiding)
		};
		
		
		// textal element selector has been used? setup the real obj
		if(typeof(obj) == 'string') {
			obj = $(obj);
		}
		
		
		// .data() system to avoid issues on multi instances
		let lcl_ai_opts = $.data(obj, 'lcl_settings', lcl_settings);	
		let lcl_ai_vars = $.data(obj, 'lcl_vars', lcl_vars);		


		
		/////////////////////////////////////////////////////////////
		
		
		
		/* given a string - returns an unique numerical hash */
		const get_hash = function(str) {
			if(typeof(str) != 'string') {
				return str;	
			}
			let hash = 0, i = 0, len = str.toString().length;
		  
			while (i < len) {
				hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
			}
			return (hash < 0) ? hash * -1 : hash;
		};
		
		
		
		/* element already elaborated? check through hash - returns false or elem object */
		const obj_already_man = function(hash) {
			let found = false;
			
			$.each(lcl_ai_vars.elems, function(i, v) {
				if(v.hash == hash) {
					found = v;
					return false;	
				}
			});
			return found;
		};
	
        
        /* get the adopted animation time. Set to zero for mobile devices and fullscren to be swifter */
        const adjusted_animation_time = function() {
            return (lcl_on_mobile || $('.lcl_fullscreen_mode').length) ? 0 : lcl_ai_opts.animation_time;
        };
        
        
        
        /* get the adopted animation time. Set to zero for mobile devices and fullscren to be swifter */
        const adjusted_fading_time = function() {
            return ($('.lcl_fullscreen_mode').length) ? 25 : lcl_ai_opts.fading_time;
        };
        
        
		
		/* revert HTML entitles that might have been used in attrs (and trim) */
		const revert_html_entit = function(str) {
			if(!str) {
                return str;
            }
			
			return str.replace(/&lt;/g, '<')
					  .replace(/&gt;/g, '>')
					  .replace(/&amp;/g, '&')
					  .replace(/&quot;/g, '"')
					  .replace(/&#039;/g, "'").trim();
		};
		
		
        
		/* returns title/text/author detecting whether to get an attribute or selector */
		const attr_or_selector_data = function($elem, subj_key) {
			const subj = lcl_ai_opts[subj_key];
			
			if(subj.indexOf('> ') !== -1) {
				return ($elem.find( subj.replace('> ', '') ).length) ? $elem.find( subj.replace('> ', '') ).html().trim() : '';
			} 
			else {
				return (typeof($elem.attr( subj )) != 'undefined') ? revert_html_entit( $elem.attr( subj )) : '';	
			}
		};
					
				
					
		/* elaborate binded elements */
		const setup_elems_obj = function($subj) {
			const o = lcl_ai_opts;

			// [src: url/selector (only required data), title: (string), descr: (string), author: (string), ajax: bool, type: image/frame/text] 
			let new_elems = []; 
			$subj.each(function() {
				const $e    = $(this),
                      src   = $e.attr(o.src_attr),
                      hash  = get_hash(src);
				
				// check against gallery hook
				if(lcl_ai_vars.gallery_hook_val && $e.attr(o.gallery_hook) != lcl_ai_vars.gallery_hook_val) {
					return true;
				}
				
				const already_man = obj_already_man(hash);
                let el = already_man;
                
				if(!already_man) {
					const type = el_type_finder(src, $e.data('lcl-type'));  
						
					// compose
					if(type != 'unknown') {
				        el = {
							src 	: src,
							type 	: type,
							hash	: false,
							title 	: (o.show_title) 	? attr_or_selector_data($e, 'title_attr') : '',	
							txt 	: (o.show_descr) 	? attr_or_selector_data($e, 'txt_attr') : '',	
							author 	: (o.show_author) 	? attr_or_selector_data($e, 'author_attr') : '',	
							thumb	: (o.thumb_attr && typeof(o.thumb_attr) != 'undefined')	? $e.attr(o.thumb_attr) : '',	
							
							width	: (type != 'image' && typeof($e.data('lcl-w')) != 'undefined') ? $e.data('lcl-w') : false,
							height	: (type != 'image' && typeof($e.data('lcl-h')) != 'undefined') ? $e.data('lcl-h') : false,
		
							force_over_data	: (typeof($e.data('lcl-force-over-data')) != 'undefined') 	? parseInt($e.data('lcl-force-over-data'), 10) : '',   
							force_outer_cmd : (typeof($e.data('lcl-outer-cmd')) != 'undefined') 		? $e.data('lcl-outer-cmd') : '',
							canonical_url	: (typeof($e.data('lcl-canonical-url')) != 'undefined') 	? $e.data('lcl-canonical-url') : '',
						};
						
						
						// download attribute
						if(type == 'image') {
							el.download = (typeof($e.data('lcl-path')) != 'undefined') ? $e.data('lcl-path') : src; 	
						}
					}
					else {
				        el = {
							src 	: src,
							type 	: type,
							hash	: false
						};
					}
				}
				
				new_elems.push(el);
			});
			
			// if only one element - remove nav arrows and thumbs nav 
			if(new_elems.length < 2) {
				$('.lcl_prev, .lcl_next, #lcl_thumb_nav').remove();	
			}
			
			if(!new_elems.length) {
				return false;	
			}
			
			// setup
			lcl_ai_vars.elems = new_elems;
			return true;
		};


		/* given element source - return its type | accepts type forcing */
		const el_type_finder = function(src, forced_type) {
			if(typeof(forced_type) == 'undefined') {
				forced_type = lcl_ai_opts.global_type;
			}
			return 'image';
		};
		
		
		/////////////
		
		
		/* smart images preload */
		const close_img_preload = function() {
			if(lcl_ai_vars.elems.length < 2 || !lcl_ai_opts.gallery) {
                return false;
            }
            
			if(lcl_ai_vars.elem_index > 0) { // prev
				maybe_preload(false, (lcl_ai_vars.elem_index - 1));	
			}
			if(lcl_ai_vars.elem_index != (lcl_ai_vars.elems.length - 1)) { // next
				maybe_preload(false, (lcl_ai_vars.elem_index + 1));		
			}
		};


        
		/* preload images and eventually trigger showing function - if index not specified, loads current index */
		const maybe_preload = function(show_when_ready, el_index, cache_check) {
			let v = lcl_ai_vars;
            
			// if forced index is missing - use current one
			if(typeof(el_index) == 'undefined') {
				el_index = v.elem_index;	
			}
			if(typeof(el_index) == 'undefined') { // if lightbox has alraedy been closed
				return false;	
			}

			// is a preloadable element?
            let to_preload = '';
			if(v.elems[el_index].type == 'image') {
                to_preload = (v.elems[el_index].type == 'image') ? v.elems[el_index].src : v.elems[el_index].poster;  
			}
					
			if(to_preload && typeof(v.img_sizes_cache[to_preload]) == 'undefined') {
				let img = new Image();
                img.src = to_preload;

                const onReady = function(e) {
                    v.img_sizes_cache[to_preload] = {
                        w: e.target.naturalWidth || e.target.width,
                        h: e.target.naturalHeight || e.target.height
                    };

                    // help chrome rendering the image faster
                    if(show_when_ready && el_index == v.elem_index){
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                show_element();
                            });
                        });
                    }
                };

                if(img.decode){
                    img.decode().then(() => onReady({ target: img })).catch(() => {
                        img.onload = onReady;
                    });
                } else {
                    img.onload = onReady;
                }
			}
			else {
				if(show_when_ready || typeof(cache_check) != 'undefined') {
					$('#lcl_loader').addClass('no_loader');
				}
				if(show_when_ready) {
					show_element();
				}
			}
		};

		
        
		// iframes preload - wait until it is loaded
		const iframes_preload = function() {
			const $subj = $('#lcl_wrap[lc-lelem='+ lcl_ai_vars.elem_index +'] #lcl_elem_wrap > iframe');
			if(!$subj.length) {
                return false;
            }
			
			$('#lcl_wrap').addClass('lcl_loading_iframe');
			temp_slideshow_stop();
			
			$subj.on('load', function() {
				$('#lcl_wrap').removeClass('lcl_loading_iframe');
				
				// set focus to allow scroll
				setTimeout(function() {
					if($('iframe.lcl_elem').length) {
						$('iframe.lcl_elem')[0].contentWindow.focus();
					}
				}, 20);

				// restart slideshow
				if($('.lcl_is_playing').length) {
					lcl_start_slideshow(true);	
				}
			});
		};
		
		
		/////////////
		
		
		/* elements parsing */
		const elems_parsing = function(inst_obj, $clicked_obj) {
			const o = $.data(inst_obj, 'lcl_settings');
			let vars = $.data(inst_obj, 'lcl_vars');

			// direct array initialization - validate and setup hashes
			if(vars.is_arr_instance) {
				let elems = [];
				
				$.each(inst_obj, function(i,v) {
					let el = {};
					
					let el_type = (typeof(v.type) == 'undefined' && o.global_type) ? o.global_type : false;
					if(typeof(v.type) != 'undefined') {
                        el_type = v.type;
                    } 
					
					if(el_type && ['image'].includes(el_type)) {
						if(typeof(v.src) != 'undefined' && v.src) {
							el.src 		= v.src;
							el.type 	= el_type;
							el.hash		= get_hash(v.src);
							
							el.title	= (typeof(v.title) == 'undefined') ? '' : revert_html_entit(v.title); 
							el.txt	 	= (typeof(v.txt) == 'undefined') ? '' : revert_html_entit(v.txt); 
							el.author 	= (typeof(v.author) == 'undefined') ? '' : revert_html_entit(v.author); 

							el.width 	= (typeof(v.width) == 'undefined') ? false : v.width;
							el.height 	= (typeof(v.height) == 'undefined') ? false : v.height;
							
							el.force_over_data 	= (typeof(v.force_over_data) == 'undefined') ? false : parseInt(v.force_over_data, 10);
							el.force_outer_cmd 	= (typeof(v.force_outer_cmd) == 'undefined') ? false : v.force_outer_cmd;
							el.canonical_url 	= (typeof(v.canonical_url) == 'undefined') ? false : v.canonical_url;
							
							el.thumb 	= (typeof(v.thumb) == 'undefined') ? false : v.thumb;
		
		
							// download calculate type and parameter
							if(el_type == 'image') {
								el.download = (typeof(v.download) != 'undefined') ? v.download : v.src; 	
							} 
                            
							el.poster = (el_type == 'image') ? '' : v.poster;

							elems.push(el);	
						}
					}
					else {
						el = {
							src 	: el.src,
							type 	: 'unknown',
							hash	: false
						};
						elems.push(el);	
					}
				});

				vars.elems = elems;
			}
			
			
			// if is from DOM object - prepare elements object	
			else {	
				let $subj = inst_obj;

				// can fetch elements in real-time? save selector
				if(o.live_elements && vars.elems_selector) {
					const consider_group = ($clicked_obj && o.gallery && o.gallery_hook && typeof($(obj[0]).attr(o.gallery_hook)) != 'undefined') ? true : false
					
					const sel = (consider_group) ? vars.elems_selector +'['+ o.gallery_hook +'='+ $clicked_obj.attr( o.gallery_hook ) +']' : vars.elems_selector;
					$subj = $(sel);
				}
				
				if(!setup_elems_obj($subj)) {
					if(!o.live_elements || (o.live_elements && !vars.elems_selector)) {
						console.error('LC Lightbox - no valid elements found');
					}
					return false;		
				}
			}

			
			// if preload every image on document's ready
			if(o.preload_all && !vars.preload_all_used) {
				vars.preload_all_used = true;
				
				$(document).ready(function(e) {
					$.each(vars.elems, function(i, v) {
						maybe_preload(false, i);
					});
				});
			}
			
			/////
			
			// elements parsed - throw callback
			if(typeof(o.elems_parsed) == 'function') {
				o.elems_parsed.call(null, lcl_ai_opts, lcl_ai_vars);
			}
			
			// elements parsed | args: elements array
			if(!vars.is_arr_instance) {
				const $subj = (vars.elems_selector) ? $(vars.elems_selector) : inst_obj;
				$subj.first().trigger('lcl_elems_parsed', [vars.elems]);
			}

			return true;
		};
		elems_parsing(obj); // parsing on lightbox INIT
		
		
		
		////////////////////////////////////////////////////////////
		
		
		
		/* open lightbox */
		const open_lb = function(inst_obj, $clicked_obj) {
			if(lcl_shown || lcl_is_active) {
                return false;
            }
            
			lcl_shown = true;
			lcl_is_active = true;
			
			// setup static globals
			lcl_curr_obj = inst_obj;
			lcl_ai_opts = $.data(inst_obj, 'lcl_settings');
			lcl_ai_vars = $.data(inst_obj, 'lcl_vars');
			
			lcl_curr_opts = lcl_ai_opts;
			lcl_curr_vars = lcl_ai_vars;
			
			const o = lcl_ai_opts,
                  $co = (typeof($clicked_obj) != 'undefined') ? $clicked_obj : false;
            
			let v = lcl_ai_vars;
            
			// check instance existence
			if(!lcl_ai_vars) {
				console.error('LC Lightbox - cannot open. Object not initialized');
				return false;	
			}
			
			
			// set gallery hook value
			v.gallery_hook_val = ($co && o.gallery && o.gallery_hook && typeof($co.attr(o.gallery_hook)) != 'undefined') ? $co.attr(o.gallery_hook) : false;
			
			// parse elements
			if(!elems_parsing(inst_obj, $clicked_obj)) {
				return false;	
			}

			// if there is a clicked element - set selected index
			if($co) {
				$.each(v.elems, function(i, e) {
					if( e.src == $co.attr(o.src_attr) ) {
						v.elem_index = i;
						return false; 	
					}
				});
				
				
			}
			
			// array initialization - check index existence
			else {
				if(parseInt(v.elem_index, 10) >= v.elems_count) {
					console.error('LC Lightbox - selected index does not exist');
					return false;		
				}
			}

			// try recalling cached images to already shape lightbox
			maybe_preload(false);
			
			// setup lightbox code
			setup_code();
            
            if((o.touchswipe)) {
                touch_events();
            }

			// directly fullscreen?
			if(v.force_fullscreen) {
                $('#lcl_wrap').addClass('lcl_pre_forced_fs_first_elem');
				enter_fullscreen(true, true);
			}
            
			// prepare thumbs nav
			if($('#lcl_thumbs_nav').length) {
				setup_thumbs_nav();	
			}
			
			// prepare first element and show
			maybe_preload(true);
			close_img_preload();
            
            $('#lcl_nav_cmd').focus();
		};
		
		
        
		/* remove lightbox pre-show classes */
		const rm_pre_show_classes = function() {
			// show window and overlay 
			$('#lcl_wrap').removeClass('lcl_pre_show').addClass('lcl_shown');
			$('#lcl_loader').removeClass('lcl_loader_pre_first_el');
		};
		

        
		/* setup lightbox code */	
		const setup_code = function() {
			const o = lcl_ai_opts;
            
			let v = lcl_ai_vars,
                wrap_classes = [],
                css = '';
			
			if($('#lcl_wrap').length) {
                $('#lcl_wrap').remove();
            }
			$('body').append(lb_code);	
			
			
			// lightbox max sizes
			$('#lcl_wrap').attr('data-lcl-max-w', o.max_width).attr('data-lcl-max-h', o.max_height);


			// command positions classes
			wrap_classes.push('lcl_'+o.ins_close_pos+'_close lcl_nav_btn_'+o.nav_btn_pos+' lcl_'+ o.ins_close_pos +'_close lcl_nav_btn_'+ o.nav_btn_pos);	
			
			// hidden thumbs nav class
			if(
				o.tn_hidden === true || 
				(typeof(o.tn_hidden) == 'number' && ($(window).width() < o.tn_hidden || $(window).height() < o.tn_hidden))
			) {
				wrap_classes.push('lcl_tn_hidden');	
			}
			
			// hide texts class
			if(
				o.txt_hidden === true || 
				(typeof(o.txt_hidden) == 'number' && ($(window).width() < o.txt_hidden || $(window).height() < o.txt_hidden)) 
			) {
				wrap_classes.push('lcl_hidden_txt');	
			}
			
			// no carousel class	
			if(!o.carousel) {
				wrap_classes.push('lcl_no_carousel');	
			}
			
			// mobile class
			if(lcl_on_mobile) {
                wrap_classes.push('lcl_on_mobile');
            }
			
			// custom classes
			if(o.wrap_class) {
                wrap_classes.push(o.wrap_class);
            }
			
			// manage elements
			wrap_classes.push('lcl_'+ o.cmd_position +'_cmd');
			if(o.cmd_position != 'inner') {
				const nav = $('#lcl_nav_cmd').detach();
				$('#lcl_wrap').prepend(nav);	
			}
			
			if(!o.slideshow)		{$('.lcl_play').remove();}
			if(!o.txt_toggle_cmd) 	{$('.lcl_txt_toggle').remove();}
			if(!o.socials) 			{$('.lcl_socials').remove();}
			if(!o.download) 		{$('.lcl_download').remove();}
			if(!o.counter || v.elems.length < 2 || !o.gallery) {$('.lcl_counter').remove();}
			
			// fullscreen
			v.force_fullscreen = false;
			if(!o.fullscreen) {
				$('.lcl_fullscreen').remove();
			}
			else if(o.fs_only === true || (typeof(o.fs_only) == 'number' && ($(window).width() < o.fs_only || $(window).height() < o.fs_only))) {
				$('.lcl_fullscreen').remove();
				lcl_ai_vars.force_fullscreen = true;
			}
				
			// prev/next buttons
			if(v.elems.length < 2 || !o.gallery) {
				$('.lcl_prev, .lcl_play, .lcl_next').remove();
			} else {
				if(o.nav_btn_pos == 'middle') {
					css += '.lcl_prev, .lcl_next {margin: '+ o.padding +'px;}';
				}	
			}
			
			// thumbs nav
			if(!o.thumbs_nav || lcl_ai_vars.elems.length < 2 || !o.gallery) {
				$('#lcl_thumbs_nav, .lcl_thumbs_toggle').remove();
			} 
			else {
				$('#lcl_thumbs_nav').css('height', o.thumbs_h); // use JS to pick outerHeight after
				
				const th_margins = $('#lcl_thumbs_nav').outerHeight(true) - o.thumbs_h; 
				css += '#lcl_wrap:not(.lcl_toggling_fs):not(.lcl_forced_fullscreen) #lcl_window {margin-top: '+ ((o.thumbs_h - th_margins ) * -1) +'px;}';
				
				// center lightbox if cmds are on top and thumbs are hidden
				css += '.lcl_tn_hidden.lcl_outer_cmd:not(.lcl_fullscreen_mode) #lcl_window {margin-bottom: '+ ($('.lcl_close').outerHeight(true) * -1) +'px;}';	
			}
			
			//////
			
			// apply skin and layout
			wrap_classes.push('lcl_txt_'+ o.data_position +' lcl_'+ o.skin);

			if(o.ol_pattern) 	{$('#lcl_overlay').addClass('lcl_pattern_'+ o.ol_pattern);}
			if(o.modal)			{$('#lcl_overlay').addClass('lcl_modal');}
			
			if(o.wrap_padding) 	{css += '#lcl_wrap {padding: '+ o.wrap_padding +';}';}
			if(o.border_w) 		{css += '#lcl_window {border: '+ o.border_w +'px solid '+ o.border_col +';}';}
			if(o.padding) 		{css += '#lcl_subj, #lcl_txt, #lcl_nav_cmd {margin: '+ o.padding +'px;}';}
			if(o.radius) 		{css += '#lcl_window, #lcl_contents_wrap {border-radius: '+ o.radius +'px;}';}
			if(o.shadow) 		{css += '#lcl_window {box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);}';}
			
			if(o.cmd_position == 'inner' && o.ins_close_pos == 'corner') {
				css += 
                    '#lcl_corner_close {'+
                        'top: '+ ((o.border_w + Math.ceil($('#lcl_corner_close').outerWidth() / 2)) * -1) +'px;'+
                        'right: '+ ((o.border_w + Math.ceil($('#lcl_corner_close').outerHeight() / 2)) * -1) +'px;'+
                    '}';
				
				
				// if no button is in inner cmd w/ corner close - hide bar (not on FS)
				if(!$('#lcl_nav_cmd > *:not(.lcl_close)').length) {
					css += 
                        '#lcl_wrap:not(.lcl_fullscreen_mode):not(.lcl_forced_outer_cmd) #lcl_nav_cmd {'+
                            'display: none;'+
                        '}';	
				}
			}
            
            if(['rside', 'lside'].includes(o.data_position) && (o.animation_time - 20) < 300) {
                css += 
                    '.lcl_txt_rside:not(.lcl_force_txt_over) #lcl_txt,'+
                    '.lcl_txt_lside:not(.lcl_force_txt_over) #lcl_txt {'+
                        'transition-duration: '+ (o.animation_time - 20) +'ms;'+
                    '}';
            }
            
            if(o.remove_scrollbar) {
                lcl_ai_vars.html_style = (typeof(jQuery('html').attr('style')) != 'undefined') ? jQuery('html').attr('style') : '';
				lcl_ai_vars.body_style = (typeof(jQuery('body').attr('style')) != 'undefined') ? jQuery('body').attr('style') : '';
				
				// avoid page scrolling and maintain contents position
				const orig_page_w = $(window).width();
				$('html').css('overflow', 'hidden');
				
				$('html').css({
					'margin-right' 	: ($(window).width() - orig_page_w),
					'touch-action'	: 'none'
				});

				$('body').css({
					'overflow' 		: 'visible',
					'touch-action'	: 'none'	
				});
            }
            

			// custom CSS
			if($('#lcl_inline_style').length) {
                $('#lcl_inline_style').remove();
            }
			$('head').append(
			'<style type="text/css" id="lcl_inline_style">'+
			css +
			'#lcl_overlay {'+
				'background-color: '+o.ol_color+';'+
				'opacity: '+o.ol_opacity+';'+
			'}'+
			'#lcl_window, #lcl_txt, #lcl_subj {'+
				'transition-duration: '+ o.animation_time +'ms;'+	
			'}'+  
            '.lcl_toggling_txt #lcl_window, .lcl_toggling_txt #lcl_subj {'+
				'transition-duration: '+ o.animation_time +'ms !important;'+	
			'}'+
			'#lcl_overlay {'+
				'transition-duration: '+o.open_close_time+'ms;'+	
			'}'+
			'.lcl_first_sizing #lcl_window, .lcl_is_closing #lcl_window {'+
				'transition-duration: '+(o.open_close_time - o.ol_time_diff)+'ms;'+	
			'}'+
			'.lcl_first_sizing #lcl_window {'+
				'transition-delay: '+o.ol_time_diff+'ms;'+	
			'}'+
			'#lcl_loader, #lcl_contents_wrap, #lcl_corner_close {'+
				'transition-duration: '+adjusted_fading_time()+'ms;'+
			'}'+
			'.lcl_toggling_txt #lcl_subj {'+ /* delay to allow sizing on text hiding */
				'transition-delay: '+(o.fading_time + 200)+'ms !important;'+
			'}'+
			'.lcl_fullscreen_mode.lcl_txt_over:not(.lcl_tn_hidden) #lcl_txt, .lcl_fullscreen_mode.lcl_force_txt_over:not(.lcl_tn_hidden) #lcl_txt {'+ /* fs txt margin when thumbs are shown */
				'max-height: calc(100% - 42px - '+ o.thumbs_h +'px);'+
			'}</style>');
						
			//////
	
			// opening element could already be shaped?
			const el = lcl_ai_vars.elems[v.elem_index];
			if(el.type != 'image' || (el.type == 'image' && typeof(v.img_sizes_cache[el.src]) != 'undefined')) {
				wrap_classes.push('lcl_show_already_shaped');
			} else {
				rm_pre_show_classes();
			}
	
				
			// apply wrap classes	
			$('#lcl_wrap').addClass( wrap_classes.join(' ') );
			
			
			//////

			// html is appended and ready - callback
			if(typeof(o.html_is_ready) == 'function') {
				o.html_is_ready.call(null, lcl_ai_opts, lcl_ai_vars);
			}
			
			// lightbox html has been appended and managed 
			if(!lcl_ai_vars.is_arr_instance) {
				const $subj = (lcl_ai_vars.elems_selector) ? $(lcl_ai_vars.elems_selector) : lcl_curr_obj;
				$subj.first().trigger('lcl_html_is_ready', [lcl_ai_opts, lcl_ai_vars]);
			}
            
            if(o.gallery && $('.lcl_next').length) {
                drag_n_drop_nav();
            }
		};
		
		
		
		// prevent page touch scroll while moving a specific element
		const no_body_touch_scroll = function(selector) {

			const _overlay = $(selector)[0];
			let _clientY = 0; // remember Y position on touch start
		
			_overlay.addEventListener('touchstart', function (event) {
				if (event.targetTouches.length === 1) {
					// detect single touch
					_clientY = event.targetTouches[0].clientY;
				}
			}, false);
		
			_overlay.addEventListener('touchmove', function (event) {
				if (event.targetTouches.length === 1) {
					// detect single touch
					disableRubberBand(event);
				}
			}, false);
		
			function disableRubberBand(event) {
				clientY = event.targetTouches[0].clientY - _clientY;
		
				if (_overlay.scrollTop === 0 && clientY > 0) {
					// element is at the top of its scroll
					event.preventDefault();
				}
		
				if (isOverlayTotallyScrolled() && clientY < 0) {
					//element is at the top of its scroll
					event.preventDefault();
				}
			}
		
			function isOverlayTotallyScrolled() {
				// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
				return _overlay.scrollHeight - _overlay.scrollTop <= _overlay.clientHeight;
			}
		};



		/* show element in lightbox */
		const show_element = function() {
			if(!lcl_shown) {
                return false;
            }
			
			let v = lcl_ai_vars,
                $subj;
            
			const el = v.elems[v.elem_index];	
			
			$('#lcl_wrap').attr('lc-lelem', v.elem_index);
			
			// if not carousel - set classes
			if(!lcl_ai_opts.carousel) {
				$('#lcl_wrap').removeClass('lcl_first_elem lcl_last_elem');
				
				if(!v.elem_index) {
					$('#lcl_wrap').addClass('lcl_first_elem');	
				}
				else if(v.elem_index == (v.elems.length - 1)) {
					$('#lcl_wrap').addClass('lcl_last_elem');	
				}
			}
			
			// global trigger - before element population | args: element object, element index 
			$(document).trigger('lcl_before_populate_global', [el, v.elem_index]);
			
			// populate
			populate_lb(el);
			
			//////
			
			// trigger right before EVERY element showing | args: element index, element object
			if(!v.is_arr_instance) {
				$subj = (v.elems_selector) ? $(v.elems_selector) : lcl_curr_obj;
				$subj.first().trigger('lcl_before_show', [el, v.elem_index]);
			}
			
			// global trigger - before EVERY element showing | args: element object, element index 
			$(document).trigger('lcl_before_show_global', [el, v.elem_index]);

			//////
			
			// actions on first opening
			if($('#lcl_wrap').hasClass('lcl_pre_first_el')) {
			
				// first element show - callback
				if(typeof(lcl_ai_opts.on_open) == 'function') {
					lcl_ai_opts.on_open.call(null, lcl_ai_opts, lcl_ai_vars);
				}
				
				// first element show | args: element
				if(!v.is_arr_instance) {
					$subj = (v.elems_selector) ? $(v.elems_selector) : lcl_curr_obj;
					$subj.first().trigger('lcl_on_open', [el, v.elem_index]);
				}
			}

			//////
			
			// set sizes and display
			size_elem(el);

			//////

            $('.lcl_pre_forced_fs_first_elem').removeClass('lcl_pre_forced_fs_first_elem');
			$('#lcl_subj').removeClass('lcl_switching_elem');
            $('#lcl_window').focus();
		};
		
		
		
		/* element has text ? */
		const elem_has_txt = function(el) {
			return (el.title || el.txt || el.author) ? true : false;	
		};
		
        
		
		/* populate lightbox */
		const populate_lb = function(el){
			const el_index = lcl_ai_vars.elem_index;
			
			// reset
			$('#lcl_elem_wrap').removeAttr('style').removeAttr('class').empty();
			
			// set classes/atts
			$('#lcl_wrap').attr('lcl-type', el.type);
			$('#lcl_elem_wrap').addClass('lcl_'+ el.type +'_elem');
			
			// setup subect
			switch(el.type) {
				case 'image' :
                    $('#lcl_elem_wrap').css('background-image', 'url(\''+ el.src +'\')').html('<img src="'+ el.src +'" draggable="false" />');
					break;
				
				default : // error message size
					$('#lcl_elem_wrap').html('<div id="lcl_inline" class="lcl_elem"><br/>Error loading the resource .. </div>');
					break; 
			}
			
			// preload iframes
			if(['image'].includes(el.type)) {
				iframes_preload();	
			}
			
			
			if(lcl_curr_opts.download) {
				if(el.download) {
					$('.lcl_download').show();
					
					const arr = el.download.split('/'),
                          filename = arr[ (arr.length -1) ];
                    
					$('.lcl_download').html('<a href="'+ el.download +'" target="_blank" download="'+ filename +'"></a>');
				}
                else {
					$('.lcl_download').hide();	
				}
			}
			
			// counter
			$('.lcl_counter').html( (el_index+1) +' / '+ lcl_ai_vars.elems.length );
			
			// texts
			if(elem_has_txt(el) && el.type != 'unknown') {
				$('#lcl_wrap').removeClass('lcl_no_txt');
				$('.lcl_txt_toggle').show();
				
				if(el.title) 	{$('#lcl_txt').append('<h3 id="lcl_title">'+ el.title +'</h3>');}
				if(el.author) 	{$('#lcl_txt').append('<h5 id="lcl_author">'+ lcl_settings.author_by_txt +' '+ el.author +'</h5>');}
				if(el.txt) 		{$('#lcl_txt').append('<section id="lcl_descr">'+ el.txt +'</section>');}
				
				// set class for bottom border
				if(el.txt) {
					if(el.title && el.author) {
						$('#lcl_txt h5').addClass('lcl_txt_border');	
					}
					else {
						if($('#lcl_txt h3').length) {
							$('#lcl_txt h3').addClass('lcl_txt_border');	
						} else {
							$('#lcl_txt h5').addClass('lcl_txt_border');		
						}
					}
				}
			}
			else {
				$('.lcl_txt_toggle').hide();
				$('#lcl_wrap').addClass('lcl_no_txt');	
			}
			
			
			// prevent body scroll moving text
			no_body_touch_scroll('#lcl_txt');
		};
		
        
		
		/* 
		 * given a CSS size (integer (px), %, vw or vh) returns the related pixel value 
		 * dimension = w or h
		 */
		const css_size_to_px = function(size, dimension, ignore_max) {
			let px = 0; 
            if(!size) {
                return px;  
            }
            
			const $wrap = $('#lcl_wrap'),
                  win_w = $(window).width() - parseInt($wrap.css('padding-left'), 10) - parseInt($wrap.css('padding-right'), 10),
                  win_h = $(window).height() - parseInt($wrap.css('padding-top'), 10) - parseInt($wrap.css('padding-bottom'), 10);
			
			if(!isNaN(parseFloat(size)) && isFinite(size)) { // integer value
				px = parseInt(size, 10);	
			}
			else if	(size.toString().indexOf('%') !== -1) {
				const val = (dimension == 'w') ? win_w : win_h;
				px = val * (parseInt(size, 10) / 100);	
			}
			else if	(size.toString().indexOf('vw') !== -1) {
				px = win_w * (parseInt(size, 10) / 100);
			}
			else if	(size.toString().indexOf('vh') !== -1) {
				px = win_h * (parseInt(size, 10) / 100);
			}
			
			// avoid > 100% values
			if(typeof(ignore_max) == 'undefined') {
				if(dimension == 'w' && px > win_w) {px = win_w;} 
				if(dimension == 'h' && px > win_h) {px = win_h;}
			}
			return px;
		};
		
	
        
		/* set element sizes */
        const size_elem = function(el, flags) { // flags: no_txt_under, inner_cmd_checked
            const o = lcl_ai_opts,
                  fs_mode = ($('.lcl_fullscreen_mode, .lcl_forced_fullscreen').length) ? true : false,
                  add_space = (fs_mode) ? 0 : ((parseInt(o.border_w, 10) * 2) + (parseInt(o.padding, 10) * 2));

            let v = lcl_ai_vars,
                img_sizes,
                w, h;

            if(typeof(flags) === 'undefined') flags = {};

            // side-text layout: reset forced on hover
            if(typeof(flags.side_txt_checked) === 'undefined' && (!flags.no_txt_under)) {
                $('#lcl_wrap').removeClass('lcl_force_txt_over');
            }

            const side_txt = (!$('.lcl_force_txt_over').length && !$('.lcl_hidden_txt').length &&
                              ['rside','lside'].includes(o.data_position) && elem_has_txt(el)) ? $('#lcl_txt').outerWidth() : 0;

            const thumbs_nav = (!fs_mode && $('#lcl_thumbs_nav').length && !$('.lcl_tn_hidden').length)
                               ? $('#lcl_thumbs_nav').outerHeight(true) - parseInt($('#lcl_wrap').css('padding-bottom'), 10)
                               : 0;

            const cmd_h = (!fs_mode && $('.lcl_outer_cmd').length)
                          ? $('.lcl_close').outerHeight(true) + parseInt($('#lcl_nav_cmd').css('padding-top'), 10) + parseInt($('#lcl_nav_cmd').css('padding-bottom'), 10)
                          : 0;

            const horiz_add_space = add_space,
                  vert_add_space  = add_space + thumbs_nav + cmd_h;

            // global max sizes (A)
            const max_w_attr = $('#lcl_wrap').attr('data-lcl-max-w'),
                  max_h_attr = $('#lcl_wrap').attr('data-lcl-max-h');

            let max_w = fs_mode ? $(window).width() : Math.max(0, Math.floor(css_size_to_px(max_w_attr, 'w')) - horiz_add_space),
                max_h = fs_mode ? $(window).height() : Math.max(0, Math.floor(css_size_to_px(max_h_attr, 'h')) - vert_add_space);

            $('#lcl_window').css({
                maxWidth: max_w,
                maxHeight: max_h
            });

            // sizes already calculated
            if(typeof(v.txt_und_sizes) === 'object') {
                w = v.txt_und_sizes.w;
                h = v.txt_und_sizes.h;

                if(el.type === 'image') {
                    img_sizes = v.img_sizes_cache[el.src];
                }
            }
            else {
                switch(el.type) {
                    case 'image':
                        $('#lcl_elem_wrap').css('bottom', 0);

                        if(typeof(v.img_sizes_cache[el.src]) === 'undefined') {
                            setTimeout(() => size_elem(el, flags), 50);
                            return false;
                        }
                        img_sizes = v.img_sizes_cache[el.src];

                        // media max sizes (C) - side text excluded
                        const media_max_w = max_w - side_txt,
                              media_max_h = max_h;

                        const img_ratio = img_sizes.w / img_sizes.h,
                              box_ratio = media_max_w / media_max_h;

                        if(img_ratio > box_ratio) {
                            w = media_max_w;
                            h = Math.round(w / img_ratio);
                        } else {
                            h = media_max_h;
                            w = Math.round(h * img_ratio);
                        }

                        if(elem_has_txt(el) && !$('.lcl_hidden_txt').length && o.data_position === 'under' && !flags.no_txt_under) {
                            txt_under_h(w, h, media_max_h);

                            $(document).off('lcl_txt_und_calc').on('lcl_txt_und_calc', function() {
                                if(v.txt_und_sizes) {
                                    if(v.txt_und_sizes === 'no_under') {
                                        flags.no_txt_under = true;
                                    }
                                    size_elem(v.elems[v.elem_index], flags);
                                }
                            });

                            return false;
                        }
                        else {
                            $('#lcl_subj').css('maxHeight','none');
                        }
                        break;
                        

                    default:
                        w = 280;
                        h = 125;
                        break;
                }
            }

            // side text adjustment
            if((o.data_position === 'rside' || o.data_position === 'lside') && !$('.lcl_no_txt').length && typeof(flags.side_txt_checked) === 'undefined') {
                img_sizes = (el.type==='image') ? v.img_sizes_cache[el.src] : '';
                let tot = el.force_over_data || 400;
                
                if(el.type !== 'image' || lcl_on_mobile || (el.type === 'image' && img_sizes.w > tot && img_sizes.h > tot)) {
                    if(!side_to_over_txt(el, tot, w, h)) {
                        flags.side_txt_checked = true;
                        return size_elem(el, flags);
                    }
                }
            }

            
            // text under - must reduce height by the margin value to avoid huge spaces
            if(elem_has_txt(el) && !$('.lcl_hidden_txt').length && o.data_position === 'under' && !flags.no_txt_under) {
                h = h - parseInt(o.padding, 10);
            }
            
			// reset text under var
			v.txt_und_sizes = false;
	
			// force outer commands?
			if(
				typeof(flags.inner_cmd_checked) == 'undefined' && 
				(o.cmd_position == 'inner' || el.force_outer_cmd) &&  
				inner_to_outer_cmd(el, w)
			) {
				flags.inner_cmd_checked = true; 
				return size_elem(el, flags);
			}


			// set lb window sizes
			$('#lcl_wrap').removeClass('lcl_pre_first_el');
			$('#lcl_window').css({
				width	: (fs_mode) ? '100%' : w + add_space + side_txt,
				height	: (fs_mode) ? '100%' : h + add_space
			});
			
			
			// if has to be shown already shaped
			if($('.lcl_show_already_shaped').length) {
				setTimeout(function() { // allow CSS propagation
					$('#lcl_wrap').removeClass('lcl_show_already_shaped');	
					rm_pre_show_classes();
				}, 10);
			}
						
			// check thumbs nav arrows visibility
			thumbs_nav_arrows_vis();

			if(typeof(lcl_size_n_show_timeout) != 'undefined') {
				clearTimeout(lcl_size_n_show_timeout);
			}
            
			let timing = ($('.lcl_first_sizing').length) ? o.open_close_time + 20 : adjusted_animation_time(); // +20 trick used to let CSS execute the opening timing
			if($('.lcl_browser_resize').length || $('.lcl_toggling_fs').length || fs_mode) {
				timing = 0;
			}
            
			lcl_size_n_show_timeout = setTimeout(function() {
				if(lcl_is_active) {
                    lcl_is_active = false;
                }
				
				// autoplay if first opening
				if($('.lcl_first_sizing').length) {
					if(	o.autoplay && v.elems.length > 1 &&
						(o.carousel || v.elem_index < (v.elems.length - 1))
					) {
						lcl_start_slideshow();	
					}
				}
				
				// html element - set auto height
				if(el.type == 'html' && !fs_mode && !$('.lcl_first_sizing').length) {
					$('#lcl_window').css('height', 'auto');		
				}
				
				// fullscreen - image rendering manag
				if(el.type == 'image') {
					if($('.lcl_fullscreen_mode').length) {
						fs_img_manag(img_sizes);
					} else {
						$('.lcl_image_elem').css('background-size', 'cover');
					}
				}
				
				// focus iframe to track click
				if($('.lcl_loading_iframe').length) {
					lcl_iframe_click();	
				}

				$('#lcl_wrap').removeClass('lcl_first_sizing lcl_switching_elem lcl_is_resizing lcl_browser_resize');
				$('#lcl_loader').removeClass('no_loader');
				$(document).trigger('lcl_resized_window');
			}, timing);
		};
		
        
		/* track window size changes */
		$(window).resize(function() {
			if(!lcl_shown || obj != lcl_curr_obj || $('.lcl_toggling_fs').length) {
                return false;
            }
			$('#lcl_wrap').addClass('lcl_browser_resize');
			
			if(typeof(lcl_rs_defer) != 'undefined') {
                clearTimeout(lcl_rs_defer);
            }
			lcl_rs_defer = setTimeout(function() {
				lcl_resize();
			}, 50);
		});
		
		
		
		/* calculate text under size - return new element's width and height in an object */
		const txt_under_h = function(curr_w, curr_h, max_height, recursive_count) {
			const rc = (typeof(recursive_count) == 'undefined') ? 1 : recursive_count,
                  fs_mode = $('.lcl_fullscreen_mode').length,
                  old_txt_h = Math.ceil($('#lcl_txt').outerHeight()),
                  w_ratio = curr_w / curr_h;
			
			// fullscreen mode and thumbs - text always over
			if(fs_mode && $('#lcl_thumbs_nav').length) {
				$('#lcl_wrap').addClass('lcl_force_txt_over');
				$('#lcl_subj').css('maxHeight', 'none');
					
				$('#lcl_txt').css({
					'right' : 0,
					'width' : 'auto'
				});
				
				lcl_ai_vars.txt_und_sizes = 'no_under';
				$(document).trigger('lcl_txt_und_calc');
				return false;		
			}
			
			// reset
			$('#lcl_wrap').removeClass('lcl_force_txt_over').addClass('lcl_txt_under_calc');
			
			if(!fs_mode) {
				$('#lcl_txt').css({
					'right' : 'auto',
					'width' : curr_w
				});
			}
            else {
				$('#lcl_txt').css({
					'right' : 0,
					'width' : 'auto'
				});	
			}
			
			// wait for CSS to be rendered
			if(typeof(lcl_txt_under_calc) != 'undefined') {
                clearInterval(lcl_txt_under_calc);
            } 
			lcl_txt_under_calc = setTimeout(function() {
				const txt_h = Math.ceil( $('#lcl_txt').outerHeight() ),
                      overflow = (curr_h + txt_h) - max_height;
				
				// fullscreen mode (no thumbs) - just set max height
				if(fs_mode) {
					$('#lcl_wrap').removeClass('lcl_txt_under_calc');
					$('#lcl_subj').css('maxHeight', 'calc(100% - '+ txt_h +'px)');
					
					lcl_ai_vars.txt_und_sizes = {w: curr_w, h: curr_h};
					$(document).trigger('lcl_txt_und_calc');
					return false;			
				}
				
				// there's overflow - recurse
				if(overflow > 0 && ( typeof(recursive_count) == 'undefined' || recursive_count < 10)) {
					const new_h = curr_h - overflow,
                          new_w = Math.floor(new_h * w_ratio);	
					
					
					// text over threshold
					let tot = lcl_ai_vars.elems[lcl_ai_vars.elem_index].force_over_data;
					if(!tot) {
                        tot = 300;
                    } 
					
					if(new_w < tot || new_h < tot) {
						$('#lcl_wrap').removeClass('lcl_txt_under_calc').addClass('lcl_force_txt_over'); // screen too small or image excessively tall - switch to text over
						$('#lcl_subj').css('maxHeight', 'none');
						
						$('#lcl_txt').css({
							'right' : 0,
							'width' : 'auto'
						});
						
						lcl_ai_vars.txt_und_sizes = 'no_under';
						$(document).trigger('lcl_txt_und_calc');
						return true;		
					}
	
					return txt_under_h(new_w, new_h, max_height, (rc + 1));
				}
				
				// no overflow - ok
				else {
					$('#lcl_wrap').removeClass('lcl_txt_under_calc');
					$('#lcl_subj').css('maxHeight', curr_h);
					
					lcl_ai_vars.txt_und_sizes = {
						w: curr_w, 
						h: (curr_h + txt_h)
					};
					
					$(document).trigger('lcl_txt_und_calc');
					return true;	
				}
			}, 120); // min val to let CSS propagate
		};

		
		
		/* is lightbox too small to show contents with side text? turn into over txt */
		const side_to_over_txt = function(el, threshold, w, h) {
			const already_forced = $('.lcl_force_txt_over').length;

			if(w < threshold || (el.type != 'html' && h < threshold)) {
				if(already_forced) {
                    return true;
                }	
				$('#lcl_wrap').addClass('lcl_force_txt_over');		
			}
			else {
				if(!already_forced) {
                    return true;
                }
				
				$('#lcl_wrap').removeClass('lcl_force_txt_over');
			}
			
			return false;
		};
		
        
		
		/* are inner commands too wide for lb window? move to outer */
		const inner_to_outer_cmd = function(el, window_width) {
			const fs_mode = ($('.lcl_fullscreen_mode').length) ? true : false;
			
			// if already acted - reset
			if($('.lcl_forced_outer_cmd').length) {
				$('#lcl_wrap').removeClass('lcl_forced_outer_cmd');
				$('#lcl_wrap').removeClass('lcl_outer_cmd').addClass('lcl_inner_cmd');
				
				const nav = $('#lcl_nav_cmd').detach();
				$('#lcl_window').prepend(nav);		
			}
			
			// calculate
			if(!fs_mode && lcl_ai_vars.inner_cmd_w === false) {
				lcl_ai_vars.inner_cmd_w = 0;
				
				$('#lcl_nav_cmd .lcl_icon').each(function() {
					if(($(this).hasClass('lcl_prev') || $(this).hasClass('lcl_next')) && lcl_ai_opts.nav_btn_pos == 'middle') {
						return true;
					}
							
					lcl_ai_vars.inner_cmd_w = lcl_ai_vars.inner_cmd_w + $(this).outerWidth(true);
				});
			}
			
			// is wider?
			if(fs_mode || el.force_outer_cmd || window_width <= lcl_ai_vars.inner_cmd_w) {
				$('#lcl_wrap').addClass('lcl_forced_outer_cmd');
				$('#lcl_wrap').removeClass('lcl_inner_cmd').addClass('lcl_outer_cmd');
				
				var nav = $('#lcl_nav_cmd').detach();
				$('#lcl_wrap').prepend(nav);		
				
				return true;
			}
			else {
				return false;	
			}
		};
		
		
		//////////////////////////////////////////////////////////////
		
		
		/* switch element - new_el could be "next", "prev" or element index */
		const switch_elem = function(new_el, slideshow_switch) {
			let v 			= lcl_ai_vars; 
			const carousel	= lcl_ai_opts.carousel;
			
			if(lcl_is_active || v.elems.length < 2 || !lcl_ai_opts.gallery || $('.lcl_switching_elem').length) {
                return false;
            }
            
			// find and sanitize new index
			if(new_el == 'next'){
				if(v.elem_index == (v.elems.length - 1)) {
					if(!carousel) {
                        return false;
                    }
					new_el = 0;		
				}
				else {
					new_el = v.elem_index + 1;	
				}
			}
			else if(new_el == 'prev') {
				if(!v.elem_index) {
					if(!carousel) {
                        return false;
                    }
					new_el = (v.elems.length - 1);		
				}
				else {
					new_el = v.elem_index - 1;	
				}	
			}
			else {
				new_el = parseInt(new_el, 10);
				if(new_el < 0 || new_el >= v.elems.length || new_el == v.elem_index) {
					return false;
				}	
			}
			
			
			// if slideshow is active
			if(typeof(lcl_slideshow) != 'undefined') {
				
				// if isn't a slideshow switch and it is active || if isn't carousel and index is latest one - stop ss
				if(typeof(slideshow_switch) == 'undefined' || (!carousel && new_el == (v.elems.length - 1))) {
					lcl_stop_slideshow();
				}
			}
			
			
			// hide current element and set a new one
			lcl_is_active = true;
			thumbs_nav_scroll_to_item(new_el);	
			
			// use maybe_preload to not display loader when next item is already cached
			maybe_preload(false, new_el, true);
			
			
			// switching wrapper class		
			$('#lcl_wrap').addClass('lcl_switching_elem');	

			setTimeout(function() {

				// if switching from an html element - set static heights
				if(v.elems[v.elem_index].type == 'html') {
					$('#lcl_window').css('height', $('#lcl_contents_wrap').outerHeight());
					$('#lcl_contents_wrap').css('maxHeight', 'none');
				}
				

				// switching element - callback
				if(typeof(lcl_ai_opts.on_elem_switch) == 'function') {
					lcl_ai_opts.on_elem_switch.call(null, lcl_ai_opts, lcl_ai_vars, new_el);
				}
				
				// switching | args: old_elem_id, new_elem_id
				if(!v.is_arr_instance && lcl_curr_obj) {
					const $subj = (v.elems_selector) ? $(v.elems_selector) : lcl_curr_obj;
					$subj.first().trigger('lcl_on_elem_switch', [v.elem_index, new_el]);
				}	
				
				//////
				
				$('#lcl_wrap').removeClass('lcl_no_txt lcl_loading_iframe');	
				$('#lcl_txt').empty();
				v.elem_index = new_el;
				
				maybe_preload(true);
				close_img_preload();
			}, adjusted_fading_time());
		};
		
		
		
		/* temporary stop slideshow (to wait a preloader for example) */
		const temp_slideshow_stop = function() {
			if(typeof(lcl_slideshow) == 'undefined') {
                return false;
            }
			clearInterval(lcl_slideshow);	
		};
		
		
        
		/* progressbar animation management */
		const progbar_animate = function(first_run) {
			const o = lcl_ai_opts;
			if(!o.progressbar) {
                return false;
            }
			
			const delay = (first_run) ? 0 : (adjusted_animation_time() + adjusted_fading_time()),
                  time = o.slideshow_time + adjusted_animation_time() - delay;
			
			if(!$('#lcl_progressbar').length) {
				$('#lcl_wrap').append('<div id="lcl_progressbar"></div>');	
			}
			
			if(typeof(lcl_pb_timeout) != 'undefined') {
                clearTimeout(lcl_pb_timeout);
            }
			lcl_pb_timeout = setTimeout(function() {
				$('#lcl_progressbar').stop(true).removeAttr('style').css('width', 0).animate({width: '100%'}, time, 'linear', function() {
					
					$('#lcl_progressbar').fadeTo(0, 0); // duration through CSS
				});
			}, delay);
		};
		
		
		
		/* close lightbox */
		const close_lb = function() {
			if(!lcl_shown) {
                return false;
            }
			
			// lightbox is about to be closed - callback
			if(typeof(lcl_ai_opts.on_close) == 'function') {
				lcl_ai_opts.on_close.call(null, lcl_ai_opts, lcl_ai_vars);
			}
			
			// event on lightbox closing
			if(!lcl_ai_vars.is_arr_instance) {
				var $subj = (lcl_ai_vars.elems_selector) ? $(lcl_ai_vars.elems_selector) : lcl_curr_obj;
				$subj.first().trigger('lcl_on_close');
			}
			
			// global trigger - on lightbox closing 
			$(document).trigger('lcl_on_close_global');
			
			//////
			
			$('#lcl_wrap').removeClass('lcl_shown').addClass('lcl_is_closing lcl_tn_hidden');
			lcl_stop_slideshow();

			// exit fullscreen
			if($('.lcl_fullscreen_mode').length) {
				exit_browser_fs();
			}
			
			// remove lb - wait for animations
			setTimeout(function() {
				$('#lcl_wrap, #lcl_inline_style').remove();
				
				// remove scrollbar? remove class
				if(lcl_ai_opts.remove_scrollbar) {
                    $('html').attr('style', lcl_ai_vars.html_style);
					$('body').attr('style', lcl_ai_vars.body_style);
				}
				
				
				// global trigger - lightybox has been closed and code removed
				$(document).trigger('lcl_closed_global');
				
				
				lcl_curr_obj	= false;
				lcl_curr_opts 	= false;
				lcl_curr_vars 	= false;
				
				lcl_shown 		= false; 
				lcl_is_active 	= false;
				
			}, (lcl_ai_opts.open_close_time + 80));
			
			if(typeof(lcl_size_check) != 'undefined') {
                clearTimeout(lcl_size_check);
            }
		};
		
		
		
		//////////////////////////////////////////////////////////////
		
		
		
		/* get URL query vars and returns them into an associative array */
		const get_url_qvars = function() {
			lcl_hashless_url = window.location.href;
			
			if(lcl_hashless_url.indexOf('#') !== -1) {
				const hash_arr = lcl_hashless_url.split('#');
				lcl_hashless_url = hash_arr[0];
				lcl_url_hash = '#' + hash_arr[1];
			}
			
			// detect
			let qvars = {};
			const raw = lcl_hashless_url.slice(lcl_hashless_url.indexOf('?') + 1).split('&');
			
			$.each(raw, function(i, v) {
				var arr = v.split('=');
				qvars[arr[0]] = arr[1];
			});	
			
			return qvars;
		};
		
		
        
		//////////////////////////////////////////////////////////////
		
		
		
		/* Setup fullscreen mode */
		const enter_fullscreen = function(set_browser_status, on_opening) {
			if(typeof(on_opening) == 'undefined') {
                on_opening = false;
            }
            
			if(!lcl_shown || !lcl_ai_opts.fullscreen || (!on_opening && lcl_is_active) || $('#lcl_wrap').hasClass('lcl_fullscreen_mode')) {
                return false;
            }
            
			const o = lcl_ai_opts;
			let v = lcl_ai_vars;

			// hide window elements
            const no_fs_animation_class = (on_opening) ? ' lcl_forced_fullscreen' : '';
			$('#lcl_wrap').addClass('lcl_toggling_fs'+ no_fs_animation_class);
			
			// enbale browser's fs
            if(set_browser_status) {
                const canFullscreen =
                    o.browser_fs_mode &&
                    document.fullscreenEnabled &&
                    navigator.userActivation?.hasBeenActive;

                if(canFullscreen) {
                    const el = document.documentElement;

                    if(el.requestFullscreen) {
                        el.requestFullscreen();
                    } else if (el.webkitRequestFullscreen) {
                        el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                    }
                }
            }
			
			// set wrap class - recalculate sizes - show
			const timing = (on_opening) ? o.open_close_time : o.fading_time;
               
			setTimeout(function() {
				$('#lcl_wrap').addClass('lcl_fullscreen_mode');
				size_elem( v.elems[v.elem_index] );

				// disable fs toogle class when has been sized
				$(document).on('lcl_resized_window', function() {
					$(document).off('lcl_resized_window');
					
					// text under or on opening - recalculate
					if(on_opening || (lcl_curr_opts.data_position == 'under' && !$('.lcl_force_txt_over').length)) {
						size_elem( lcl_curr_vars.elems[lcl_curr_vars.elem_index] );
					}
					
                    setTimeout(function() {
                        $('#lcl_wrap').removeClass('lcl_toggling_fs');
                    }, 150); // 50 (sizing) + 100 (smoothing) is forced sizing timing for fs switch 
				});
			}, timing);
			
			//////
			
			// entering fullscreen - callback
			if(typeof(o.on_fs_enter) == 'function') {
				o.on_fs_enter.call(null, o, v);
			}
			
			// entering fullscreen - action
			if(!lcl_ai_vars.is_arr_instance) {
				lcl_curr_obj.first().trigger('lcl_on_fs_enter');
			}
		};
		
        
		
		/* fullscreen image rendering manag - smart/fit/fill */
		const fs_img_manag = function(img_sizes) {
			const behav = lcl_ai_opts.fs_img_behavior;

			// if image is smaller than screen - bg size = auto
			if($('.lcl_fullscreen_mode').length && img_sizes.w <= $('#lcl_subj').width() && img_sizes.h <= $('#lcl_subj').height()) {
				$('.lcl_image_elem').css('background-size', 'auto');
				return false;		
			}
			
			
			// fit into screen
			if(behav == 'fit') {
				$('.lcl_image_elem').css('background-size', 'contain');	
			}
			
			// fill screen
			else if(behav == 'fill') {
				$('.lcl_image_elem').css('background-size', 'cover');	
			}
			
			// smart - fill only if is bigger than screen or same aspect ratio
			else {
				
				
				if(typeof(img_sizes) == 'undefined') {
					$('.lcl_image_elem').css('background-size', 'cover');	
					return false;	
				}
								
				const ratio_diff = ($(window).width() / $(window).height()) - (img_sizes.w / img_sizes.h),
                      w_diff = $(window).width() - img_sizes.w,
                      h_diff = $(window).height() - img_sizes.h; 
	
				if( (ratio_diff <= 1.15 && ratio_diff >= -1.15) && (w_diff <= 350 && h_diff <= 350) ) { // fill
					$('.lcl_image_elem').css('background-size', 'cover');	
				}
				else { // fit
					$('.lcl_image_elem').css('background-size', 'contain');	
				}	
			}	
		};
		
		
        
		/* exit fullscreen */
        const exit_fullscreen = function(set_browser_status) {
			const o = lcl_ai_opts;
            
            if(!lcl_shown || !o.fullscreen || lcl_is_active || !$('#lcl_wrap').hasClass('lcl_fullscreen_mode')) {
                return false;
            }
            if(o.fs_only === true || (typeof(o.fs_only) == 'number' && ($(window).width() < o.fs_only || $(window).height() < o.fs_only))) {
                return false;   
            }
            
			// hide window elements
			$('#lcl_wrap').addClass('lcl_toggling_fs');

			// set wrap class - recalculate sizes - show
			setTimeout(function() {
                let browser_fs_timing;
                
				// disable browser's fs
				if(o.browser_fs_mode && typeof(set_browser_status) != 'undefined') {
					exit_browser_fs();
					browser_fs_timing = 250; // time taken by browser to exit fullscreen mode
				} else {
					browser_fs_timing = 0;	
				}
				
				$('#lcl_wrap').removeClass('lcl_fullscreen_mode');
				
				// resize after a little while
				setTimeout(function() {
					size_elem( lcl_ai_vars.elems[lcl_ai_vars.elem_index] );
					
					// disable fs toogle class
					setTimeout(function() {
						$('#lcl_wrap').removeClass('lcl_toggling_fs lcl_forced_fullscreen');
					}, 150); // 50 (sizing) + 100 (smoothing) is forced sizing timing for fs switch
					
				}, browser_fs_timing);
			}, 70);

			//////
			
			// exiting fullscreen - callback
			if(typeof(o.on_fs_exit) == 'function') {
				o.on_fs_exit.call(null, lcl_ai_opts, lcl_ai_vars);
			}
			
			// exiting fullscreen - action
			if(!lcl_ai_vars.is_arr_instance) {
				const $subj = (lcl_ai_vars.elems_selector) ? $(lcl_ai_vars.elems_selector) : lcl_curr_obj;
				$subj.first().trigger('lcl_on_fs_exit');
			}
		};
		
		
        
		/* trigger browser instruction to exit fullscreen mode */
		const exit_browser_fs = function() {
            const isFullscreen =
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement;

            if(!isFullscreen) {
                return;
            }

            if(document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
		};
        
		
		//////////////////////////////////////////////////////////////
		
		
		/* setup thumbnails navigator */
		const setup_thumbs_nav = function() {
			let mixed_types = false,
                tracked_type;
            
			const uniq_id = Date.now();
			
			$('#lcl_thumbs_nav').append('<span class="lcl_tn_prev"></span><ul class="lcl_tn_inner"></ul><span class="lcl_tn_next"></span>');
			$('#lcl_thumbs_nav').attr('rel', uniq_id);

			$.each(lcl_ai_vars.elems, function(i, v) {
				if(v.type != 'unknown') {
					
					if(!mixed_types) {
						if(!tracked_type || tracked_type == v.type) {
							tracked_type = v.type;	
						}
						else {
							mixed_types = true;	
						}
					}
					
					let bg_img = '';
						tpc = ''; // thumbs preload class
					
					
					// has got a specific thumbnail?
					if(v.thumb) {
						bg_img = v.thumb;
					}
					else {
					
						// find thumbnail for each source
						switch(v.type) {
							case 'image' 	: bg_img = v.src; break;
						}
						
						if(bg_img) {
							
							// has thumbs maker?
							if(lcl_ai_opts.thumbs_maker_url && (v.poster || ['youtube', 'vimeo', 'dailymotion'].includes(v.type))) {
								 var base = lcl_ai_opts.thumbs_maker_url;
								 bg_img = base.replace('%URL%', encodeURIComponent(bg_img)).replace('%W%', lcl_ai_opts.thumbs_w).replace('%H%', lcl_ai_opts.thumbs_h);
							}
                           
						}
					}
					
					const img_preview = (bg_img) ? '<img src="'+ bg_img +'" />' : ''; 
                    
					// thumbs preload class
					tpc = 'lcl_tn_preload';
					
					// append
					$('.lcl_tn_inner').append('<li class="lcl_tn_'+ v.type +' '+ tpc +'" title="'+ v.title +'" rel="'+i+'">'+ img_preview +'</li>');	
					
					// thumbs image preload
					if(tpc) {
						thumbs_nav_img_preload(bg_img, i, uniq_id);
					}
				}
			});
			
			
			// be sure at least 2 elements are left
			if($('.lcl_tn_inner > li').length < 2) {
				$('#lcl_thumbs_nav').remove();
				return false;
			}
			
			$('.lcl_tn_inner > li').css('width', lcl_ai_opts.thumbs_w);
			$('.lcl_tn_inner').lcl_smoothscroll(0.3, 400, false, true);
		
			// mixed type class
			if(mixed_types && lcl_ai_opts.tn_icons) {
				$('.lcl_tn_inner').addClass('lcl_tn_mixed_types');	
			}
		
			// elem offset - use a bit of delay to let thumbs to have proper shape
			setTimeout(function() {
				thumbs_nav_scroll_to_item(lcl_ai_vars.elem_index);
			}, 300);
		};
		
		
        
		/* thumbs image preload */
		const thumbs_nav_img_preload = function(img_url, el_index, uniq_id) {
			$('<img/>').on("load", function(){ 
				if(!lcl_ai_vars) {
                    return false;
                }
				
				lcl_ai_vars.img_sizes_cache[ img_url ] = {
					w : this.width,
					h : this.height	
				};
				
				$('#lcl_thumbs_nav[rel='+ uniq_id +'] li[rel='+ el_index +']').removeClass('lcl_tn_preload');
				setTimeout(function() {
					thumbs_nav_arrows_vis();
					thumbs_nav_arrows_opacity();
				}, 500);
			}).attr('src', img_url);
		};
		
        
		
		/* thumbs navigator - thumbs total width */
		const thumbs_nav_elems_w = function() {
			let thumbs_w = 0;
			$('.lcl_tn_inner > li').each(function() {
                thumbs_w = thumbs_w + $(this).outerWidth(true);
            });
			
			return thumbs_w;
		};
		
		
        
		/* thumbs navigator - arrows visibility */
		const thumbs_nav_arrows_vis = function() {
			if(!$('#lcl_thumbs_nav').length) {
                return false;
            }
			
			if(thumbs_nav_elems_w() > $('.lcl_tn_inner').width()) {
				$('#lcl_thumbs_nav').addClass('lcl_tn_has_arr');
			} else {
				$('#lcl_thumbs_nav').removeClass('lcl_tn_has_arr');
			}
		};
		
        
		
		/* thumbs navigator - arrows opacity */
		const thumbs_nav_arrows_opacity = function() {
			const sl = $('.lcl_tn_inner').scrollLeft();
			
			if(!sl) {
				$('.lcl_tn_prev').addClass('lcl_tn_disabled_arr');	
			} else {
				$('.lcl_tn_prev').removeClass('lcl_tn_disabled_arr');	
			}
			
			if(sl >= (thumbs_nav_elems_w() - $('.lcl_tn_inner').width())) {
				$('.lcl_tn_next').addClass('lcl_tn_disabled_arr');	
			} else {
				$('.lcl_tn_next').removeClass('lcl_tn_disabled_arr');	
			}
		};
		$(document).on('lcl_smoothscroll_end', '.lcl_tn_inner', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			thumbs_nav_arrows_opacity();
		});	
		
		
        
		/* thumbs navigator - scroll to shown element - centering it */
		const thumbs_nav_scroll_to_item = function(elem_id) {
			const $subj = $('.lcl_tn_inner > li[rel='+ elem_id +']');
			if(!$subj.length) {
                return false;
            }
			
			let id = 0;
			$('.lcl_tn_inner > li').each(function(i,v) {
                if($(this).attr('rel') == elem_id) {
					id = i;
					return false;	
				}
            });
			
			// center thumb with scroll
			const elem_w = $('.lcl_tn_inner > li').last().outerWidth(),
                  margin = parseInt($('.lcl_tn_inner > li').last().css('margin-left'), 10),
                  wrap_w = $('.lcl_tn_inner').width(),
                  to_center = Math.floor( ($('.lcl_tn_inner').width() - elem_w - margin) / 2 ),
                  new_offset = ((elem_w * id) + margin * (id - 1)) + Math.floor(margin / 2) - to_center;
			
			$('.lcl_tn_inner').stop(true).animate({"scrollLeft" : new_offset}, 500, function() {
				$('.lcl_tn_inner').trigger('lcl_smoothscroll_end');	
				
				// show after having scrolled
				$('#lcl_thumbs_nav').removeClass('lcl_pre_tn_scroll');
			});
			
			// set selected nav thumb class
			$('.lcl_tn_inner > li').removeClass('lcl_sel_thumb');
			$subj.addClass('lcl_sel_thumb');
		};
		
		
		/* lc smooth scroll system */
        $.fn.lcl_smoothscroll = function(ratio, duration, ignoreX, ignoreY) {
            if(lcl_on_mobile) {
                return this; // return this for chaining
            }

            const trackX = (typeof ignoreX === 'undefined' || !ignoreX),
                  trackY = (typeof ignoreY === 'undefined' || !ignoreY);

            return this.each(function() {
                const $subj = $(this);

                $subj.off("pointermove pointerdown pointerup pointercancel mouseenter mouseleave");

                let curDown = false,
                    pointerId = null,
                    $clicked_el,
                    curYPos = 0,
                    curXPos = 0,
                    startYPos = 0,
                    startXPos = 0,
                    startScrollY = 0,
                    startScrollX = 0;

                // pointer down
                $subj.on('pointerdown', function(e) {
                    if (e.pointerType !== 'mouse') return;

                    $clicked_el = $(e.target);
                    e.preventDefault();

                    curDown = true;
                    pointerId = e.pointerId;

                    startScrollY = $subj.scrollTop();
                    startScrollX = $subj.scrollLeft();
                    curYPos = startYPos = e.pageY;
                    curXPos = startXPos = e.pageX;

                    e.currentTarget.setPointerCapture(pointerId);
                });

                // pointer move
                $subj.on('pointermove', function(e) {
                    if (!curDown || e.pointerId !== pointerId) return;
                    $subj.stop(true);

                    if (trackX) $subj.scrollLeft(startScrollX + (curXPos - e.pageX));
                    if (trackY) $subj.scrollTop(startScrollY + (curYPos - e.pageY));
                });

                // pointer up / cancel
                const endDrag = function(e) {
                    if (!curDown || e.pointerId !== pointerId) return;

                    curDown = false;
                    pointerId = null;
                    e.currentTarget.releasePointerCapture(e.pointerId);

                    const currScrollY = $subj.scrollTop(),
                          scrollDiffY = (startScrollY - currScrollY) * -1,
                          newScrollY = currScrollY + (scrollDiffY * ratio),

                          currScrollX = $subj.scrollLeft(),
                          scrollDiffX = (startScrollX - currScrollX) * -1,
                          newScrollX = currScrollX + (scrollDiffX * ratio);

                    // trigger click if minimal movement
                    const deltaX = Math.abs(e.pageX - startXPos),
                          deltaY = Math.abs(e.pageY - startYPos);
                    if (deltaX < 3 && deltaY < 3) {
                        $clicked_el.trigger('lcl_tn_elem_click');
                        return false;
                    }

                    // animated scroll
                    if(Math.abs(scrollDiffY) > 20 || Math.abs(scrollDiffX) > 20) {
                        let anim_obj = {};
                        if (trackY) anim_obj["scrollTop"] = newScrollY;
                        if (trackX) anim_obj["scrollLeft"] = newScrollX;

                        $subj.stop(true).animate(anim_obj, duration, 'linear', function() {
                            $subj.trigger('lcl_smoothscroll_end');
                        });
                    }
                };
                $subj.on('pointerup pointercancel', endDrag);

                // fallback: reset drag if window loses focus
                $(window).on('blur', function() {
                    curDown = false;
                    pointerId = null;
                });
            });
        };

		
		//////////////////////////////////////////////////////////////
		

		/* show lightbox - click handlers */
		if(!lcl_vars.is_arr_instance) {
			if(lcl_settings.live_elements && lcl_vars.elems_selector) { // switch between static and dynamic elements retrieval   	
					
				$(document).off('click', lcl_vars.elems_selector).on('click', lcl_vars.elems_selector, function(e) {
					e.preventDefault();
					
					// update elements count - live 
					let vars = $.data(obj, 'lcl_vars');	
					vars.elems_count = $(lcl_vars.elems_selector).length;

					// open lightbox
					open_lb(obj, $(this));
					
					// binded element click - lb should open | args: clicked element 
					obj.first().trigger('lcl_clicked_elem', [$(this)]);
				});	
			}
			else {
				obj.off('click');
				obj.on('click', function(e) {
					e.preventDefault();
					
					open_lb(obj, $(this));
					
					// binded element click - lb should open 
					obj.first().trigger('lcl_clicked_elem', [$(this)]);
				});
			}
		}
		
		
		/* close clicking overlay or button */
		$(document).on('click', '#lcl_overlay:not(.lcl_modal), .lcl_close, #lcl_corner_close', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }	
			close_lb();
		});	
		
		
		/* navigation button - prev */
		$(document).on('click', '.lcl_prev', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			switch_elem('prev');
		});	
		
		/* navigation button - next */
		$(document).on('click', '.lcl_next', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			switch_elem('next');
		});	
		
		
		/* Keyboard events */
        let lcl_fs_key_timeout;
		$(document).bind('keydown',function(e){
			if(lcl_shown) {
				if(obj != lcl_curr_obj) {
                    return true;
                }
				
				// next 
				if(e.keyCode == 39) {
					e.preventDefault();
					switch_elem('next');
				}
				
				// prev
				else if(e.keyCode == 37) {
					e.preventDefault();
					switch_elem('prev');
				}
				
				// close
				else if(e.keyCode == 27) {
					e.preventDefault();
					close_lb();
				}
			}
		});
		
		
        
		/* elems navigation with mousewheel */ 
		$(document).on('wheel', '#lcl_overlay, #lcl_window, #lcl_thumbs_nav:not(.lcl_tn_has_arr)', function(e) {
			if(obj != lcl_curr_obj || !lcl_curr_opts.mousewheel) {
                return true;
            }
			const delta = e.originalEvent.deltaY;
            let $target = $(e.target);
                  

			// if not in window, do it!
			if(!$target.is('#lcl_window') && !$target.parents('#lcl_window').length) {
				e.preventDefault();
				(delta > 0) ? switch_elem('next') : switch_elem('prev');
			}
			
			else {
				// cycle to know if parents have scrollers
				let perform = true;
				for(let a=0; a<20; a++) {
					if($target.is('#lcl_window')) {
                        break;
                    }
					
					if($target[0].scrollHeight > $target.outerHeight()) {
						perform = false;	
						break;
					}
					else {
						$target = $target.parent();	
					}
				}
				
				if(perform) {
					e.preventDefault();
                    (delta > 0) ? switch_elem('next') : switch_elem('prev');
				}
			}
		});
		
            
        
        /* interactive navigation dragging the image */
        const drag_n_drop_nav = function() {
            if(!lcl_ai_opts.touchswipe) {
                return;   
            }

            let isDragging = false,
                dragLocked = false,
                isMultiTouch = false,
                startX = 0,
                currentX = 0,
                finalDeltaX = 0;

            const $container = $('#lcl_window'),
                  el = $container[0],
                  LOCK_THRESHOLD = 8,   // px to lock the gesture
                  ACTION_THRESHOLD = 85; // px to trigger navigation

            let $dragTarget = $container;

            // mouse + touch logic
            const startDrag = (pageX) => {
                isDragging = true;
                dragLocked = false;
                startX = pageX;
                finalDeltaX = 0;

                // choose drag target based on fullscreen mode
                $dragTarget = $('.lcl_fullscreen_mode').length
                    ? $('.lcl_image_elem')
                    : $container;

                // get current translateX value (if any)
                const matrix = window.getComputedStyle($dragTarget[0]).transform;
                currentX = (matrix !== 'none') ? parseFloat(matrix.split(',')[4]) : 0;

                // disable transition while dragging
                $dragTarget.css({
                    transition: 'none',
                    cursor: 'grabbing'
                });
            };

            const moveDrag = (pageX) => {
                if(!isDragging) {
                    return;
                }

                finalDeltaX = pageX - startX;

                // lock drag direction early to avoid browser scroll hijack
                if(!dragLocked) {
                    if(Math.abs(finalDeltaX) < LOCK_THRESHOLD) {
                        return;
                    }
                    dragLocked = true;
                }

                $dragTarget.css({
                    transform: `translateX(${currentX + finalDeltaX}px)`
                });
            };

            const endDrag = () => {
                if(!isDragging) {
                    return;
                }
                isDragging = false;

                // restore original styles
                $dragTarget.css({
                    cursor: '',
                    transition: '',
                    transform: ''
                });

                // trigger navigation only if drag distance is significant
                if(Math.abs(finalDeltaX) >= ACTION_THRESHOLD) {
                    const comeback_timing = (lcl_ai_opts.animation_time > 50)
                        ? lcl_ai_opts.animation_time - 50
                        : 0;

                    setTimeout(() => {
                        if(finalDeltaX > 0) {
                            switch_elem('prev');
                        } else {
                            switch_elem('next');
                        }
                    }, comeback_timing);
                }
            };

            // mouse actions
            $container.on('mousedown', function(e) {
                if(!$(e.target).is('.lcl_image_elem')) {
                    return;
                }
                startDrag(e.pageX);
            });

            $(document).on('mousemove', function(e) {
                moveDrag(e.pageX);
            });

            $(document).on('mouseup blur mouseleave', endDrag);

            // touch actions
            el.addEventListener('touchstart', function(e) {

                // if becomes multitouch → abort drag
                if(e.touches.length > 1) {
                    isMultiTouch = true;
                    endDrag();
                    return;
                }

                if(!e.target.closest('.lcl_image_elem')) {
                    return;
                }

                isMultiTouch = false;
                startDrag(e.touches[0].pageX);

            }, { passive: true });

            el.addEventListener('touchmove', function(e) {

                // multitouch detected mid-gesture → abort
                if(e.touches.length > 1 || isMultiTouch) {
                    isMultiTouch = true;
                    endDrag();
                    return;
                }

                if(!isDragging) {
                    return;
                }

                e.preventDefault();
                moveDrag(e.touches[0].pageX);

            }, { passive: false });

            el.addEventListener('touchend', function(e) {
                if(e.touches.length > 0) {
                    return;
                }
                isMultiTouch = false;
                endDrag();
            });

            el.addEventListener('touchcancel', function() {
                isMultiTouch = false;
                endDrag();
            });
        };
        
		
		/* toggle text */ 
		$(document).on('click', '.lcl_txt_toggle', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			const o = lcl_ai_opts;

			// class lcl_toggling_txt enables window sizing animations
			if(!lcl_is_active && !$('.lcl_no_txt').length && !$('.lcl_toggling_txt').length) {
				if(o.data_position != 'over') {
					
					const txt_on_side = (o.data_position == 'rside' || o.data_position == 'lside') ? true : false,
                          forced_over = $('.lcl_force_txt_over').length,
                          elems_fade_timing = 200,
                          restore_timing = ($('.lcl_fullscreen_mode').length) ? o.animation_time : (o.animation_time * 2);
                    
					
					// if text on side - hide subject
					if(txt_on_side && !forced_over) {
						$('#lcl_subj').stop().fadeTo(elems_fade_timing, 0);	
					} 
					// text under - hide 
					else {
						if(!forced_over) {
							$('#lcl_contents_wrap').stop().fadeTo(elems_fade_timing, 0);
						}
					}
					
					$('#lcl_wrap').toggleClass('lcl_hidden_txt'); 
                    
					
					if(!forced_over) {
						lcl_is_active = true;
						$('#lcl_wrap').addClass('lcl_toggling_txt');
						
						// wait until text is hidden
						setTimeout(function() {
							lcl_is_active = false;
							lcl_resize();
						}, o.animation_time);
						
                        setTimeout(function() {
                            $('#lcl_wrap').removeClass('lcl_toggling_txt');
                            
							if(txt_on_side && !forced_over) {
								$('#lcl_subj').stop().fadeTo(elems_fade_timing, 1);	
							} else {
								if(!forced_over) {
									$('#lcl_contents_wrap').stop().fadeTo(elems_fade_timing, 1);	
								}
							}
						}, restore_timing);
					}
				}
				
				// text over - just hide
				else {
					$('#lcl_wrap').toggleClass('lcl_hidden_txt'); 
				}
			}
		});	
		
		
        
		/* start/end slideshow */
		$(document).on('click', '.lcl_play', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			($('.lcl_is_playing').length) ? lcl_stop_slideshow() : lcl_start_slideshow();
		});	
		


		/* toggle socials */
		$(document).on('click', '.lcl_socials', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			// show
			if(!$('.lcl_socials > div').length) {
				const el = lcl_curr_vars.elems[ lcl_curr_vars.elem_index ],
                      page_url = encodeURIComponent(window.location.href),
                      title = encodeURIComponent(el.title).replace(/'/g, "\\'"),
                      descr = encodeURIComponent(el.txt).replace(/'/g, "\\'");

				// find image's URL
                let img;
				if(el.type == 'image') {
					img = el.src;
				}
                else {
					img = (el.poster) ? el.poster : false;
					if(!img && typeof(el.vid_poster) != 'undefined') {
                        img = el.vid_poster;
                    }
				}


				// prepare and append code
				let code = 
				'<div class="lcl_socials_tt lcl_tooltip lcl_tt_bottom">';
				
					if(lcl_curr_opts.fb_share_params) {
						
						let share_url = page_url;
						share_url += (window.location.href.indexOf('?') === -1) ? '%3F' : '%26';
						share_url += encodeURIComponent(lcl_curr_opts.fb_share_params.replace('%TITLE%', title).replace('%DESCR%', descr).replace('%IMG%', img)); 
						
						code += '<a class="lcl_icon lcl_fb" onClick="window.open(\'https://www.facebook.com/sharer?u='+ share_url +'&display=popup\',\'sharer\',\'toolbar=0,status=0,width=590,height=500\');" href="javascript: void(0)" title="share on Facebook" aria-label="share on Facebook" tabindex="61"></a>';	
					} else {
						code += '<a class="lcl_icon lcl_fb" onClick="window.open(\'https://www.facebook.com/sharer?u='+ page_url +'&display=popup\',\'sharer\',\'toolbar=0,status=0,width=590,height=500\');" href="javascript: void(0)" title="share on Facebook" aria-label="share on Facebook" tabindex="61"></a>';	
					}

					code += '<a class="lcl_icon lcl_twit" onClick="window.open(\'https://twitter.com/share?text=Check%20out%20%22'+ title +'%22%20@&url='+ page_url +'\',\'sharer\',\'toolbar=0,status=0,width=548,height=325\');" href="javascript: void(0)" title="share on X" aria-label="share on X" tabindex="62"></a>';
					
					// on mobile - use Whatsapp
					if(lcl_on_mobile) {
						code += '<a class="lcl_icon lcl_wa" href="whatsapp://send?text='+ page_url +'" data-action="share/whatsapp/share" title="share on WhatsApp" aria-label="share on WhatsApp" tabindex="63"></a>'; 	
					}
                
					// pinterest only if there's an image
					if(img) {
						code += 	
						'<a class="lcl_icon lcl_pint" onClick="window.open(\'http://pinterest.com/pin/create/button/?url='+ page_url +'&media='+ encodeURIComponent(img) +'&description='+ title +'\',\'sharer\',\'toolbar=0,status=0,width=575,height=330\');" href="javascript: void(0)" title="share on Pinterest" aria-label="share on Pinterest" tabindex="64"></a>';
					}
				
				code += 	
				'</div>';
				
				$('.lcl_socials').addClass('lcl_socials_shown').html(code);
				
				setTimeout(function() { // delay to let CSS execute animation
					$('.lcl_socials_tt').addClass('lcl_show_tt');
				}, 20);
			}
			
			// hide	
			else {
				$('.lcl_socials_tt').removeClass('lcl_show_tt');
				
				setTimeout(function() {
					$('.lcl_socials').removeClass('lcl_socials_shown').empty();	
				}, 260);
			}
		});
		
		
		/* toggle fullscreen via button */
		$(document).on('click', '.lcl_fullscreen', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			if($('.lcl_fullscreen_mode').length) {
				exit_fullscreen(true);
			} else {
				enter_fullscreen(true);	
			}
		});	
		
	
		
		/* thumbs navigator - toggle */
		$(document).on('click', '.lcl_thumbs_toggle', function(e) {		
			if(obj != lcl_curr_obj) {
                return true;
            }
			const fs_mode = $('.lcl_fullscreen_mode').length;
            
			$('#lcl_wrap').addClass('lcl_toggling_tn').toggleClass('lcl_tn_hidden');
			
			// if not fullscreen - hide contents
			if(!fs_mode) {
				setTimeout(function() {
					lcl_resize();
				}, 160);	
			}

			setTimeout(function() {
                $('#lcl_wrap').removeClass('lcl_toggling_tn');
			}, lcl_curr_opts.animation_time + 50);
		});	
		
		
        
		/* thumbs navigator - switch element */
		$(document).on('click lcl_tn_elem_click', '.lcl_tn_inner > li:not(.lcl_sel_thumb)', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
            
			switch_elem( $(this).attr('rel') );
		});	
		
        
		
		/* thumbs navigator - navigate with arrows click */
		$(document).on('click', '.lcl_tn_prev:not(.lcl_tn_disabled_arr)', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			$('.lcl_tn_inner').stop(true).animate({"scrollLeft" : ($('.lcl_tn_inner').scrollLeft() - lcl_curr_opts.thumbs_w - 10)}, 300, 'linear', function() {
				$('.lcl_tn_inner').trigger('lcl_smoothscroll_end');	
			});
		});	
		
		$(document).on('click', '.lcl_tn_next:not(.lcl_tn_disabled_arr)', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			$('.lcl_tn_inner').stop(true).animate({"scrollLeft" : ($('.lcl_tn_inner').scrollLeft() + lcl_curr_opts.thumbs_w + 10)}, 300, 'linear', function() {
				$('.lcl_tn_inner').trigger('lcl_smoothscroll_end');	
			});
		});	
		
		
        
		/* thumbs navigator -  navigate with mousewheel */
		$(document).on('wheel', '#lcl_thumbs_nav.lcl_tn_has_arr', function(e) {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			e.preventDefault();
			const delta = e.originalEvent.deltaY;
			
			(delta > 0) ? $('.lcl_tn_prev:not(.lcl_tn_disabled_arr)').trigger('click') : $('.lcl_tn_next:not(.lcl_tn_disabled_arr)').trigger('click');
		});
		
        
		
		/* right click prevent */
		$(document).on("contextmenu", "#lcl_wrap *", function() {
			if(obj != lcl_curr_obj) {
                return true;
            }
			
			if(lcl_ai_opts.rclick_prevent) {
				return false;
			}
		}); 
		
        
		
		/* avoid page scrolling on touch devices */ 
		$(window).on('touchmove', function(e) {
			if(!lcl_shown || !lcl_on_mobile || obj != lcl_curr_obj) {
                return true;
            }
            const $t = $(e.target);
			
			if(!$(e.target).parents('#lcl_window').length && !$(e.target).parents('#lcl_thumbs_nav').length) {
				e.preventDefault();
			}
		});
        
        
        
        /* copy lightbox link - share option */
        $(document).on('click', '.lcl_copy_dlu', function(e) {
            if(obj != lcl_curr_obj) {
                return true;
            }
            e.preventDefault();
            
            navigator.clipboard.writeText(window.location.href);
            return false;
        });
        
        
        
        /* change focus on nav commands */
        $(document).on('keydown', function(e) {
            if(obj != lcl_curr_obj) {
                return true;
            }
            
            if(e.key === "Tab" && $('.lcl_shown').length) {
                e.preventDefault();
                
                let focusableElements = $('#lcl_wrap').find('#lcl_corner_close, #lcl_nav_cmd button.lcl_icon, #lcl_nav_cmd a.lcl_icon').not(':hidden').sort((a, b) => (a.tabIndex || 0) - (b.tabIndex || 0)),
                    index = focusableElements.index(document.activeElement);

                index = ((index + 1) >= focusableElements.length) ? 0 : index + 1;
                focusableElements.eq(index).focus();
            }
        });
        
        
        // remove focus status on click to not display the outline
        $(document).on('mousedown', '#lcl_nav_cmd a, #lcl_nav_cmd button', function(e) {
            if(obj != lcl_curr_obj) {
                return true;
            }
            
            const $this = $(this);
            setTimeout(() => {
                $(this).blur();
            }, 5);
        });
        
		
		/////////////////////////////////////////////////////////////
		
		
		// touchswipe
        const touch_events = function() {
            const el = $('#lcl_subj');

            let touchStartX = 0,
                touchStartY = 0,
                touchEndX = 0,
                touchEndY = 0,
                touchStartTime = 0,
                lastTap = 0,
                zoom_debounce,
                lcl_is_pinching = false,
                pinchStartDistance = 0,
                lcl_pinch_delay,
                lcl_swipe_delay;

            // Single Tap e Double Tap
            el.on('touchend', function(e) {
                // ignore if there are multiple fingers
                if(e.originalEvent.touches.length > 0) {
                    return;
                }

                const currentTime = new Date().getTime(),
                      tapLength = currentTime - lastTap;

                // Double Tap (due tap entro 300ms)
                if(tapLength < 300 && tapLength > 0) {
                    
                } 
                
                // Single Tap
                else {
                    lastTap = currentTime;
                    setTimeout(function() {
                        if(lastTap === currentTime) {
                            if($(e.target).attr('id') === 'lcl_overlay' && !lcl_ai_opts.modal) {
                                lcl_close();
                            }
                        }
                    }, 300);
                }
            });

            el.on('touchmove', function(e) {
                const touches = e.originalEvent.touches;

                if(touches.length === 2) {
                    e.preventDefault();
                    lcl_is_pinching = true;

                    if(typeof lcl_swipe_delay !== 'undefined') {
                        clearTimeout(lcl_swipe_delay);
                    }
                    if(typeof lcl_pinch_delay !== 'undefined') {
                        clearTimeout(lcl_pinch_delay);
                    }

                    const dx = touches[0].clientX - touches[1].clientX,
                          dy = touches[0].clientY - touches[1].clientY,
                          currentDistance = Math.sqrt(dx * dx + dy * dy),
                          scale = currentDistance / pinchStartDistance;
                }
            });

            el.on('touchend', function(e) {
                if(e.originalEvent.touches.length === 0) {
                    setTimeout(function() {
                        lcl_is_pinching = false;
                        pinchStartDistance = 0;
                    }, 100);
                }
            });

            // Swipe tracking
            $('#lcl_wrap').on('touchstart', function(e) {
                const touches = e.originalEvent.touches;
                touchStartX = touches[0].clientX;
                touchStartY = touches[0].clientY;
                touchStartTime = new Date().getTime();
            });

            // swipe-up to close lightbox
            $('#lcl_wrap').on('touchend', function(e) {
                if(lcl_is_pinching) {
                    return;
                }

                const changedTouches = e.originalEvent.changedTouches;
                touchEndX = changedTouches[0].clientX;
                touchEndY = changedTouches[0].clientY;

                const deltaY = touchStartY - touchEndY,
                      deltaX = Math.abs(touchStartX - touchEndX),
                      viewportHeight = $(window).height(),
                      swipeThreshold = viewportHeight * 0.4,
                      touchDuration = new Date().getTime() - touchStartTime;

                if(
                    deltaY > swipeThreshold && 
                    deltaY > deltaX && 
                    touchDuration < 500 && 
                    !lcl_ai_opts.modal
                ) {
                    lcl_close();
                }
            });
        };


		/////////////////////////////////////////////////////////////
		
		
		//// PUBLIC METHODS
        
		// set current settings and vars - for actions with lightbox opened - return false if object not initialized
		const set_curr_vars = function() {
			if(!lcl_curr_obj) {
                return false;
            }
			
			lcl_ai_vars = $.data(lcl_curr_obj, 'lcl_vars');
			lcl_ai_opts = $.data(lcl_curr_obj, 'lcl_settings');

			if(!lcl_ai_vars) {
				console.error('LC Lightbox. Object not initialized');
				return false;	
			}
			return true;
		};
		
        
		
		// open lightbox
		lcl_open = function(obj, index) {
			lcl_ai_vars = $.data(obj, 'lcl_vars');
			let v = lcl_ai_vars;

			// check instance existence
			if(!v) {
				console.error('LC Lightbox - cannot open. Object not initialized');
				return false;	
			}
			else if(typeof(v.elems[index]) == 'undefined') {
				console.error('LC Lightbox - cannot open. Unexisting index');
				return false;	
			}		
			else {
				v.elem_index = index;
				$clicked_obj = (v.is_arr_instance) ? false : $(obj[index]); 
				
				return open_lb(obj, $clicked_obj);	
			}
		};
        
		
		// resize lightbox
		lcl_resize = function() {
			if(!lcl_shown || lcl_is_active || !set_curr_vars()) {
                return false;
            }
			
			let v = lcl_ai_vars;
			if(typeof(lcl_size_check) != 'undefined') {
                clearTimeout(lcl_size_check);
            }
			
			lcl_size_check = setTimeout(function() {
				$('#lcl_wrap').addClass('lcl_is_resizing');
				thumbs_nav_arrows_opacity();
				
				const el = v.elems[ v.elem_index ];
				return size_elem(el);
			}, 20);	
		};
		
		
		// close lightbox and destroy vars
		lcl_close = function() {
			if(!lcl_shown || lcl_is_active || !set_curr_vars()) {
                return false;
            }
			return close_lb();
		};	
		
		
		// pagination (next/prev/index)
		lcl_switch = function(new_el) {
			if(!lcl_shown || lcl_is_active || !set_curr_vars()) {
                return false;
            }
			return switch_elem(new_el);
		};
		
		
		// start slideshow
		lcl_start_slideshow = function(restart) {
			if(!lcl_shown || (typeof(restart) == 'undefined' && typeof(lcl_slideshow) != 'undefined') || !set_curr_vars()) {
                return false;
            }
			const o = lcl_ai_opts;

			// if is latest element and isn't carousel - return false
			if(!o.carousel && lcl_ai_vars.elem_index == (lcl_ai_vars.elems.length - 1)) {
				return false;	
			}
			
			if(typeof(lcl_slideshow) != 'undefined') {clearInterval(lcl_slideshow);} // if reset timing
			$('#lcl_wrap').addClass('lcl_is_playing');
			
			const time = o.animation_time + o.slideshow_time;
			
			// use progressbar?
			progbar_animate(true);
			
			// start
			lcl_slideshow = setInterval(function() {
				progbar_animate(false);
				switch_elem('next', true);
			}, time);
			
			//////
			
			if(typeof(restart) == 'undefined') {
				
				// slideshow start - callback
				if(typeof(o.slideshow_start) == 'function') {
					o.slideshow_start.call(null, o, lcl_ai_vars);
				}
				
				// slideshow start - hook | args: interval time
				if(!lcl_ai_vars.is_arr_instance) {
					var $subj = (lcl_ai_vars.elems_selector) ? $(lcl_ai_vars.elems_selector) : lcl_curr_obj;
					$subj.first().trigger('lcl_slideshow_start', [time]);
				}
			}
			
			return true;
		};
		
		
        
		// stop slideshow
		lcl_stop_slideshow = function() {
			if(!lcl_shown || typeof(lcl_slideshow) == 'undefined' || !set_curr_vars()) {
                return false;
            }
			const o = lcl_ai_opts;

			// check instance existence
			if(!o) {
				console.error('LC Lightbox. Object not initialized');
				return false;	
			}
			
			clearInterval(lcl_slideshow);
            lcl_slideshow = undefined;
            
			$('#lcl_wrap').removeClass('lcl_is_playing');
			
			$('#lcl_progressbar').stop(true).animate({'marginTop' : ($('#lcl_progressbar').height() * -3)}, 300, function() {
				$(this).remove();
			});
			
			//////
			
			// slideshow end - callback
			if(typeof(o.slideshow_end) == 'function') {
				o.slideshow_end.call(null, lcl_ai_opts, lcl_ai_vars);
			}
			
			// slideshow end - hook
			if(!lcl_ai_vars.is_arr_instance) {
				const $subj = (lcl_ai_vars.elems_selector) ? $(lcl_ai_vars.elems_selector) : lcl_curr_obj;
				$subj.first().trigger('lcl_slideshow_end', []);
			}

			
			return true;
		};	
		
		return obj;
	};
})(jQuery);