export async function build({presentation,input}){
 const slide=presentation.slides.getItem(0);slide.size={width:1400,height:2200};slide.background.fill='#FFFFFF';
 const text=(name,value,x,y,w,h,size,color='#253047',bold=false)=>{const t=slide.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});t.text=value;t.text.style={fontSize:size,typeface:'Arial Unicode MS',color,bold,autoFit:'none',verticalAlignment:'top',insets:0,lineSpacing:1.15};return t;};
 text('team','트랙 3   트리오남',72,42,500,32,20,'#63738F');
 slide.images.add({path:input.logo,alt:'ScrollFact 공식 로고',fit:'contain',position:{left:930,top:25,width:400,height:133}});
 text('title','같은 글, 다른 생각.\n스크롤하며 서로의 이유를 읽다.',72,145,1240,180,65,'#172D64',true);
 text('intro-label','프로젝트 세부 소개',72,360,245,45,25,'#3154AD',true);
 text('intro',input.copy.intro,335,350,980,155,26);
 text('problem-label','문제 정의',72,535,600,42,25,'#3154AD',true);
 text('problem',input.copy.problem,72,590,585,170,24);
 text('solution-label','해결 아이디어와 차별점',735,535,590,42,25,'#3154AD',true);
 text('solution',input.copy.solution,735,590,590,170,24);
 text('feature1-label','글 맥락 분석',72,810,470,65,44,'#172D64',true);
 text('feature1-copy',input.copy.feature1.split(': ')[1],72,900,375,225,26);
 slide.images.add({path:input.context,alt:'문단 배경과 구절별 밑줄, 해당 문단의 맥락 해설 화면',fit:'contain',position:{left:500,top:790,width:825,height:575}});
 text('feature2-label','관점 파악',930,1390,400,65,44,'#6041A3',true);
 text('feature2-copy',input.copy.feature2.split(': ')[1],930,1480,395,215,26);
 slide.images.add({path:input.opinion,alt:'기사 전체 의견 게이지와 관점별 발언을 펼친 화면',fit:'contain',position:{left:72,top:1340,width:800,height:555}});
 text('future-label','기대효과와 보완 계획',72,1970,360,80,28,'#3154AD',true);
 // Will be repositioned in next revision if the template requires different dimensions.
 text('future',input.copy.future,450,1955,875,180,26);
 slide.speakerNotes.text='문안 출처: 사용자 수정 HWPX 및 교사 피드백. 사진 출처: ScrollFact 프로젝트 HTML 화면. 대화 개선 효과는 검증되지 않은 제품 가설이며, 사용자 평가를 다음 계획에 포함했다.';
 return {slideId:slide.id};
}
