let page_image_cache = {};


let page_element_cache = {};


function getImageByURL(lq_url, hq_url, imageElement, lqDesired = false){

    if(!(lq_url in page_element_cache)){
        page_element_cache[lq_url] = [[imageElement, lqDesired]];
    }
    else{
        let foundLQ = false;

        for (const [key, value] of Object.entries(page_element_cache[lq_url])) {
            if(page_element_cache[lq_url][key][0] == imageElement){
                foundLQ = true;
                break;
            }
        }

        if(!foundLQ){
            page_element_cache[lq_url].push([imageElement, lqDesired]);
        }

    }
   

    if(!(lq_url in page_image_cache)){

        page_image_cache[lq_url] = [0, new Image()];

        //setup to trigger on load
        page_image_cache[lq_url][1].onload = function() {
            
            if(page_image_cache[lq_url][0] == 0){

                page_image_cache[lq_url][0] = 1;

                updateImageElements(lq_url, page_image_cache[lq_url][1].src, false);

                page_image_cache[lq_url][1].src = hq_url;

            }
            else if(page_image_cache[lq_url][0] == 1){

                page_image_cache[lq_url][0] = 2;

                updateImageElements(lq_url, page_image_cache[lq_url][1].src, true);

            }

            
        };

        page_image_cache[lq_url][1].src = lq_url;

        
    }

    if(page_image_cache[lq_url][0] == 2){
        updateImageElements(lq_url, page_image_cache[lq_url][1].src, true);
    }
}

function updateImageElements(lq_url, newSrc, isFull){
    let removeIndexes = [];
    for(let i=0; i < page_element_cache[lq_url].length; i++){
        let arrElement = page_element_cache[lq_url][i];

        if(arrElement[0] != null){

            let overrideFull = isFull && arrElement[1] == true;

            if(!overrideFull){
                arrElement[0].src = newSrc;
            }
            else{
                arrElement[0].src = lq_url;
            }

            if(isFull){
                arrElement[0].style.filter = 'none';
                removeIndexes.push(i);
            }
        }
        else{
            removeIndexes.push(i);
        }
    }

    let removedCount = 0;

    for(let i = page_element_cache[lq_url].length - 1; i >= 0; i--){
        for(let j=0; j < removeIndexes.length; j++){
            if(removeIndexes[j]-removedCount == i){
                page_element_cache[lq_url].splice(removeIndexes[j]-removedCount, 1);
                removedCount += 1;
            }
        }
    }

}