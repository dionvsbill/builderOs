type Block={id?:string;kind?:string;label?:string;content?:string;styles?:{align?:string;width?:string;opacity?:number;radius?:number}};
export function PublishedPage({name,blocks}:{name:string;blocks:Block[]}){
 return <main style={{minHeight:"100vh",background:"#fff",color:"#172033",fontFamily:"Inter,Arial,sans-serif"}}>
  <header style={{height:68,borderBottom:"1px solid #e8ebf1",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 max(22px,calc((100vw - 1120px)/2))"}}>
   <strong style={{fontSize:18,letterSpacing:-.5}}>{name}</strong><nav style={{display:"flex",gap:20,fontSize:12,color:"#68758a"}}><a href="#top" style={{color:"inherit",textDecoration:"none"}}>Home</a><a href="#content" style={{color:"inherit",textDecoration:"none"}}>Content</a></nav>
  </header>
  <section id="top" style={{maxWidth:1120,margin:"0 auto",padding:"70px 24px 90px"}}>
   <div id="content" style={{display:"grid",gap:28}}>
    {blocks.map((block,index)=>{
      const style={textAlign:(block.styles?.align??"left") as "left"|"center"|"right",width:block.styles?.width??"100%",opacity:(block.styles?.opacity??100)/100,borderRadius:block.styles?.radius??0,margin:"0 auto"};
      if(block.kind==="heading")return <h1 key={block.id??index} style={{...style,fontSize:"clamp(32px,6vw,62px)",lineHeight:1.08,letterSpacing:-2.2,fontWeight:800,maxWidth:900}}>{block.content}</h1>;
      if(block.kind==="text")return <p key={block.id??index} style={{...style,fontSize:17,lineHeight:1.8,color:"#586579",maxWidth:760}}>{block.content}</p>;
      if(block.kind==="button")return <div key={block.id??index} style={{...style}}><a href="#contact" style={{display:"inline-flex",padding:"13px 22px",background:"#243b70",color:"#fff",borderRadius:block.styles?.radius??8,textDecoration:"none",fontWeight:700,fontSize:14}}>{block.content}</a></div>;
      if(block.kind==="image")return <img key={block.id??index} src={block.content} alt={block.label??""} style={{display:"block",maxWidth:"100%",height:"auto",margin:"0 auto",borderRadius:block.styles?.radius??10}}/>;
      return <section key={block.id??index} style={{...style,padding:"42px 30px",background:"#f5f7fb",borderRadius:14}}><h2 style={{fontSize:24,margin:"0 0 10px"}}>{block.label??"Section"}</h2><p style={{color:"#68758a",lineHeight:1.7,margin:0}}>{block.content}</p></section>;
    })}
   </div>
  </section>
  <footer id="contact" style={{borderTop:"1px solid #e8ebf1",padding:"24px",textAlign:"center",fontSize:12,color:"#8792a4"}}>Published with BuilderOS</footer>
 </main>;
}