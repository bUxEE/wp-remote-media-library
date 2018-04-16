var wpRemoteLibrary = function(api,field,user_id,show_all) {
	var lib 	    	= this;
	this.user_id        	= user_id;
	this.url 		= api.url,
	this.key 		= api.key,
	this.token 		= api.token,
	this.showAll 		= show_all,
	this.modal  		= $('#library-modal');
	this.navs  		= $('#library-modal .nav-btn');
	this.modalContent 	= $('#library-modal .modal-content');
	this.modalBody 	    	= $('#library-modal #image-library .modal-body');
	this.closeButton    	= $('#library-modal .closer');
	this.submitButton   	= $('#library-modal #insert_submit');
	this.modalNotice    	= $('#library-modal .modal-notice')
	this.field  		= $(field);
	this.uploadField    	= $('#library-modal input[type="file"]');
	this.uploadButton   	= $('#library-modal #upload_submit');
	this.selected       	= [];
	this.files          	= [];
	this.loader 		= $('<div class="loader">'+
					'<div class="loader-icon">'+
						'<i class="fa fa-circle-o-notch fa-spin fa-3x fa-fw"></i>'+
						'<span class="sr-only">Loading...</span>'+
					'</div>'+
				    '</div>');

	this.init = function() {
		this.listeners();
	};
	this.show = function() {
		lib.selected = lib.field.val().split(",");
		lib.field.blur();
		lib.modal.fadeIn().addClass('active');
		setTimeout(function() {
			lib.modalContent.addClass('active');
		}, 400)
		$(window).trigger('wplb.modal.show');
	};
	this.hide = function() {
		lib.modalContent.removeClass('active');
		lib.modalBody.empty()
		setTimeout(function() {
			lib.modal.fadeOut().removeClass('active');
		}, 400)
		$(window).trigger('wplb.modal.hide');
	};
	this.submit = function() {
		var selected = $('#library-modal input[type="checkbox"]:checked');
		var ids = "";
		if(selected.length > 0) {
			$(selected).each(function(index, el) {
				var url = $(this).closest('.element').data('url');
				var id  = $(this).closest('.element').data('id');
				ids += index > 0 ?  "," + id : id;
			});
			lib.field.val(ids);
			lib.hide();
		}
	};
	this.listeners = function() {
		lib.field.on('focus', function() {
			lib.show();
		});
		lib.navs.on('click', function(e) {
			var target = $(this).data('toggle');
			$('.modal-section.active, .nav-btn.active').removeClass('active');
			$(this).addClass('active');
			$(target).addClass('active');
		});
		$(window).on('wplb.modal.show', function () {
			lib.loadContent();
		});
		$(lib.closeButton).on('click', function () {
			lib.hide();
		});
		$(lib.submitButton).on('click', function () {
			lib.submit();
		});
		$(lib.uploadField).change(function(e) {
			lib.parseFiles(e);
		});
		$(lib.uploadButton).click(function(e) {
			lib.uploadFiles(e);
		});
		$('#reset-btn').click(function(e) {
			$(lib.uploadField).val('');
			$('#preview').html('');
			$('#upload_submit').attr('disabled','disabled');
		});
	};
	this.setImage = function(mime,img) {
		switch(mime) {
			case "text/plain":
				img = "assets/txt.png";
				break;
			case "application/msword":
				img = "assets/doc.png";
				break;
			case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				img = "assets/doc.png";
				break;
			case "application/pdf":
				img = "assets/pdf.png";
				break;
			case "application/vnd.ms-excel":
				img = "assets/xls.png";
				break;
			case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				img = "assets/xls.png";
				break;
			default: 
				img = img;
		}
		return img;
	};
	this.parseFiles = function(event) {
		lib.files = [];
		if(event.target.files.length > 0) {
			$('#preview').html('');
			$('#upload_submit').removeAttr('disabled');
			$.each(event.target.files, function(index, file) {
			    var reader    = new FileReader();
			    var mimes     = {"png":"image/png","gif":"image/gif","jpg":"image/jpeg","jpeg":"image/jpeg","pdf":"application/pdf","doc":"application/msword","docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","txt":"text/plain",".xls":"application/vnd.ms-excel", "xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
			    reader.onload = function(e) {  
			    	var ext         = file.name.substr(file.name.lastIndexOf('.') + 1);
					object 			= {};
					object.filename = file.name;
					object.mime     = mimes[ext];
					object.file 	= reader.result.split(',').pop();

					var preview 	= lib.setImage(mimes[ext], reader.result);
					$('#preview').append('<div class="element"><img src="'+ preview + '"><div class="title">' + file.name + '</div></div>');

					lib.files.push(object);
			    };  
			    reader.readAsDataURL(file);
			});
		} else {
			$('#upload_submit').attr('disabled','disabled');
		}
	};
	this.uploadFiles = function() {
		lib.loader.appendTo(lib.modalContent);
		var data = JSON.stringify({
		    key      : lib.key,
	    	token    : lib.token,
		    action 	 : "upload_files_remote",
		    user_id	 : lib.user_id,
		    files    : lib.files
		});
		$.ajax({
			url: lib.url,
			type:"POST",
			data: data,
			contentType:"application/json; charset=utf-8",
			dataType:"json"
		}).done(function( resp ) {
			lib.loader.remove(); 
			if(resp.code == 200) {
				var ids = "";
				lib.modalNotice.html('File caricati');
				resp.data.forEach(function(el, index) {
					ids += index > 0 ?  "," + el.ID : el.ID;
				});
				lib.field.val(ids);
				lib.hide();
				$('.nav-btn.active, #file-upload').removeClass('active');
				$('[data-toggle="#image-library"], #image-library').addClass('active');
			} else {
				lib.modalNotice.html('Errore caricamento file');
			}
		});
	}
	this.loadContent = function() {
		lib.loader.appendTo(lib.modalContent);
		$.post( this.url, 
			{
			    key: lib.key,
			    token: lib.token,
			    action:"get_files_remote",
			    user_id: lib.user_id,
			    show_all: lib.showAll
			}
		).done(function( resp ) {
			console.log(resp);
		    lib.loader.remove();
		    if(resp.code == 200) {
		    	resp.data.forEach(function(el, index) {
		    		var selected = lib.selected.map(function (x) { 
					    return parseInt(x, 10); 
					});

					el.icon = lib.setImage(el.post_mime_type, el.icon);

		    		var checked = selected.indexOf(el.ID) != -1 ? "checked" : "";
		    		var img = $('<div class="element" data-id="' + el.ID + '" data-url="' + el.guid + '"><input type="checkbox" name="image-' + el.ID + '" id="image-' + el.ID + '" value="' + el.ID + '" ' + checked + '><label for="image-' + el.ID + '"><img src="'+ el.icon + '"><div class="title">' + el.filename + '</div></label></div>');
		    		img.appendTo(lib.modalBody);
		    	});
		    } else {
		    	lib.modalNotice.html('Errore caricamento file');
		    }
		});
	}

	this.init();
}

jQuery(document).ready(function($) {
	var credentials = {
		url: 'YOUR_SITE_ADMIN_AJAX_URL',
		key: "A_SECRET_KEY",
		token: "A_SECRET_TOKEN"
	}
	// wpRemoteLibrary(credentials,'#FIELD_ID',USER_ID,SHOW_ALL(boolean));
	wpRemoteLibrary(credentials,'#files',1,false);
});
